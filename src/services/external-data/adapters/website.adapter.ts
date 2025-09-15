/**
 * Personal Website Scraper Adapter
 * 
 * Extracts portfolio projects, blog posts, and testimonials
 * from personal websites
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import * as cheerio from 'cheerio';
import { EnhancedBaseService, /* EnhancedServiceConfig */ } from '../../enhanced-base-service';
import { 
  PersonalWebsite,
  PortfolioProject,
  BlogPost,
  Testimonial
} from '../types';

export class WebsiteAdapter extends EnhancedBaseService {
  // Removed unused property
  private readonly requestTimeout = 10000; // 10 seconds
  
  constructor() {
    super({
      name: 'WebsiteAdapter',
      version: '1.0.0',
      enabled: true,
      cache: {
        ttlSeconds: 3600, // 1 hour for website data
        keyPrefix: 'website_adapter',
        enableMetrics: true
      },
      apiClient: {
        timeout: 10000,
        retryAttempts: 3,
        enableRateLimit: true,
        rateLimitRequests: 10, // Conservative rate limiting
        rateLimitWindow: 60000,
        defaultHeaders: {
          'User-Agent': 'CVPlus-Bot/1.0 (CV Enhancement Service)'
        }
      },
      enableMixins: {
        cache: true,
        database: false,
        apiClient: true
      }
    });
  }

  /**
   * Fetch and parse personal website data
   */
  async fetchData(websiteUrl: string): Promise<PersonalWebsite> {
    try {
      this.logger.info('Fetching website data', { websiteUrl });
      
      // Check cache first
      const cacheKey = `website_data:${websiteUrl}`;
      const cached = await this.getCached<PersonalWebsite>(cacheKey);
      
      if (cached.cached && cached.data) {
        this.logger.info('Returning cached website data', { websiteUrl });
        return cached.data;
      }
      
      // Validate URL
      if (!this.isValidUrl(websiteUrl)) {
        throw new Error('Invalid website URL');
      }
      
      // Fix the cheerio usage - use the loaded $ instance instead of global $
      const html = await this.fetchPage(websiteUrl);
      const $ = cheerio.load(html);

      // Extract metadata
      const metadata = this.extractMetadata($, websiteUrl);

      // Discover relevant pages
      const pages = await this.discoverPages($, websiteUrl);

      // Extract content from discovered pages
      const [portfolioProjects, blogPosts, testimonials] = await Promise.all([
        this.extractPortfolioProjects($, pages),
        this.extractBlogPosts($, pages),
        this.extractTestimonials($, pages)
      ]);
      
      const website: PersonalWebsite = {
        url: websiteUrl,
        title: metadata.title,
        description: metadata.description,
        lastUpdated: metadata.lastUpdated,
        portfolioProjects,
        blogPosts,
        testimonials
      };
      
      // Cache website data for 1 hour
      await this.setCached(cacheKey, website, 3600);
      
      this.logger.info('Website data extracted', {
        url: websiteUrl,
        projectsCount: portfolioProjects.length,
        postsCount: blogPosts.length
      });
      
      return website;
      
    } catch (error: any) {
      this.logger.error('Failed to fetch website data', { error, websiteUrl });
      throw new Error(`Website fetch failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetch a web page
   */
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await this.apiGet<string>(url, {
        timeout: this.requestTimeout,
        maxRedirects: 3,
        responseType: 'text'
      });
      
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        throw new Error('Website not found');
      }
      throw error;
    }
  }

  /**
   * Extract metadata from the page
   */
  private extractMetadata($: cheerio.Root, url: string): any {
    return {
      title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
      description: $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content') || '',
      lastUpdated: $('meta[name="last-modified"]').attr('content') || 
                   new Date().toISOString()
    };
  }

  /**
   * Discover relevant pages on the website
   */
  private async discoverPages($: cheerio.Root, baseUrl: string): Promise<Map<string, string>> {
    const pages = new Map<string, string>();
    const baseUrlObj = new URL(baseUrl);
    
    // Common page patterns to look for
    const patterns = [
      'portfolio', 'projects', 'work', 'blog', 'posts', 'articles',
      'testimonials', 'reviews', 'about', 'resume', 'cv'
    ];
    
    // Find navigation links
    $('nav a, header a, .navigation a, .menu a').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().toLowerCase();
      
      if (href && patterns.some(pattern => text.includes(pattern))) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          if (absoluteUrl.startsWith(baseUrlObj.origin)) {
            pages.set(text, absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });
    
    return pages;
  }

  /**
   * Extract portfolio projects
   */
  private async extractPortfolioProjects(
    $: cheerio.Root,
    pages: Map<string, string>
  ): Promise<PortfolioProject[]> {
    const projects: PortfolioProject[] = [];
    
    // Look for portfolio/projects page
    const portfolioUrl = Array.from(pages.entries())
      .find(([key]) => key.includes('portfolio') || key.includes('project'))?.[1];
    
    if (portfolioUrl) {
      try {
        const html = await this.fetchPage(portfolioUrl);
        const page$ = cheerio.load(html);
        
        // Common portfolio selectors
        const selectors = [
          '.portfolio-item', '.project', '.work-item',
          'article.project', 'div.portfolio-entry'
        ];
        
        for (const selector of selectors) {
          page$(selector).each((_, elem) => {
            const project = this.parseProject(page$(elem));
            if (project.title) {
              projects.push(project);
            }
          });
          
          if (projects.length > 0) break;
        }
      } catch (error) {
        this.logger.warn('Failed to fetch portfolio page', { portfolioUrl, error });
      }
    }
    
    // Also check main page for projects
    $('.portfolio-item, .project, .work-item').each((_, elem) => {
      const project = this.parseProject($(elem));
      if (project.title) {
        projects.push(project);
      }
    });
    
    return projects.slice(0, 10); // Limit to 10 projects
  }

  /**
   * Parse a project element
   */
  private parseProject(elem: any): PortfolioProject {
    const $ = cheerio.load(elem);
    
    return {
      title: $('h2, h3, h4, .title, .project-title').first().text().trim(),
      description: $('p, .description, .summary').first().text().trim(),
      url: $('a').first().attr('href'),
      imageUrl: $('img').first().attr('src'),
      technologies: this.extractTechnologies($),
      role: $('.role').text().trim(),
      duration: $('.duration, .date').text().trim()
    };
  }

  /**
   * Extract technologies from project
   */
  private extractTechnologies($: cheerio.CheerioAPI): string[] {
    const techs: string[] = [];
    
    $('.tech, .technology, .skill, .tag').each((_: any, elem: any) => {
      const tech = $(elem).text().trim();
      if (tech && tech.length < 30) {
        techs.push(tech);
      }
    });
    
    return techs;
  }

  /**
   * Extract blog posts
   */
  private async extractBlogPosts(
    $: cheerio.CheerioAPI,
    pages: string[]
  ): Promise<BlogPost[]> {
    const posts: BlogPost[] = [];
    
    // Look for blog page
    const blogUrl = pages.find(page => 
      page.includes('blog') || page.includes('article')
    );
    
    if (blogUrl) {
      try {
        const html = await this.fetchPage(blogUrl);
        const page$ = cheerio.load(html);
        
        // Common blog post selectors
        page$('article, .post, .blog-post, .entry').each((_, elem) => {
          const post = this.parseBlogPost(page$(elem));
          if (post.title) {
            posts.push(post);
          }
        });
      } catch (error) {
        this.logger.warn('Failed to fetch blog page', { blogUrl, error });
      }
    }
    
    return posts.slice(0, 10); // Limit to 10 posts
  }

  /**
   * Parse a blog post element
   */
  private parseBlogPost(elem: any): BlogPost {
    const $ = cheerio.load(elem);

    const title = $('h2, h3, .title, .post-title').first().text().trim();
    const url = $('a').first().attr('href') || '';
    const excerpt = $('p, .excerpt, .summary').first().text().trim();
    const dateText = $('.date, .published, time').first().text().trim();

    const tags: string[] = [];
    $('.tag, .category').each((_, tagElem) => {
      const tag = $(tagElem).text().trim();
      if (tag) tags.push(tag);
    });
    
    return {
      title,
      url,
      excerpt,
      publishedDate: this.parseDate(dateText),
      tags,
      readTime: this.estimateReadTime(excerpt)
    };
  }

  /**
   * Extract testimonials
   */
  private async extractTestimonials(
    $: cheerio.Root,
    pages: Map<string, string>
  ): Promise<Testimonial[]> {
    const testimonials: Testimonial[] = [];
    
    // Look for testimonials page
    const testimonialsUrl = Array.from(pages.entries())
      .find(([key]) => key.includes('testimonial') || key.includes('review'))?.[1];
    
    if (testimonialsUrl) {
      try {
        const html = await this.fetchPage(testimonialsUrl);
        const page$ = cheerio.load(html);
        
        page$('.testimonial, .review, blockquote').each((_, elem) => {
          const testimonial = this.parseTestimonial(page$(elem));
          if (testimonial.text && testimonial.author) {
            testimonials.push(testimonial);
          }
        });
      } catch (error) {
        this.logger.warn('Failed to fetch testimonials page', { testimonialsUrl, error });
      }
    }
    
    // Also check main page
    $('.testimonial, .review, blockquote.testimonial').each((_, elem) => {
      const testimonial = this.parseTestimonial($(elem));
      if (testimonial.text && testimonial.author) {
        testimonials.push(testimonial);
      }
    });
    
    return testimonials.slice(0, 5); // Limit to 5 testimonials
  }

  /**
   * Parse a testimonial element
   */
  private parseTestimonial(elem: any): Testimonial {
    const $ = cheerio.load(elem);

    const text = $('p, .text, .content').first().text().trim() ||
                 $(elem).text().trim();
    const author = $('.author, .name, cite').first().text().trim();
    const role = $('.role, .title, .position').first().text().trim();
    const company = $('.company, .organization').first().text().trim();

    // Extract rating if present
    const ratingText = $('.rating, .stars').attr('data-rating') ||
                      $('.rating, .stars').text();
    const rating = ratingText ? parseFloat(ratingText) : undefined;
    
    return {
      author,
      role,
      company,
      text,
      rating
    };
  }

  /**
   * Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Parse date string
   */
  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Invalid date
    }
    
    return undefined;
  }

  /**
   * Estimate reading time
   */
  private estimateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
  
  // Enhanced service lifecycle methods
  
  protected async onInitialize(): Promise<void> {
    this.logger.info('WebsiteAdapter initializing');
    // Initialize any required connections or configurations
  }

  protected async onCleanup(): Promise<void> {
    this.logger.info('WebsiteAdapter cleaning up');
    // Cleanup resources
  }

  protected async onHealthCheck(): Promise<Partial<any>> {
    const cacheMetrics = this.getCacheMetrics();
    const rateLimitStatus = this.apiClientService?.['getRateLimitStatus']();
    
    return {
      status: 'healthy',
      component: 'WebsiteAdapter',
      timestamp: new Date().toISOString(),
      cache: {
        hitRate: this.getCacheHitRate(),
        totalRequests: cacheMetrics.totalRequests,
        errors: cacheMetrics.errors
      },
      rateLimit: rateLimitStatus
    };
  }
}