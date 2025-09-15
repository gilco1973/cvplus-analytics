/**
 * GitHub Integration Adapter
 * 
 * Fetches user profile, repositories, and contribution data from GitHub
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import axios from 'axios';
import { 
  GitHubProfile, 
  GitHubRepository, 
  GitHubStats 
} from '../types';

export class GitHubAdapter {
  private readonly baseUrl = 'https://api.github.com';
  private readonly headers: Record<string, string>;
  
  constructor() {
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CVPlus-External-Data-Integration'
    };
    
    // Add auth token if available
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      this.headers['Authorization'] = `token ${token}`;
    }
    
    logger.info('[GITHUB-ADAPTER] GitHub adapter initialized');
  }

  /**
   * Fetch all GitHub data for a user
   */
  async fetchData(username: string): Promise<{
    profile: GitHubProfile;
    stats: GitHubStats;
    repositories: GitHubRepository[];
  }> {
    try {
      logger.info('[GITHUB-ADAPTER] Fetching GitHub data', { username });
      
      // Fetch data in parallel
      const [profile, repositories] = await Promise.all([
        this.fetchProfile(username),
        this.fetchRepositories(username)
      ]);
      
      // Calculate statistics
      const stats = this.calculateStats(repositories);
      
      logger.info('[GITHUB-ADAPTER] GitHub data fetched successfully', {
        username,
        repoCount: repositories.length,
        totalStars: stats.totalStars
      });
      
      return {
        profile,
        stats,
        repositories: repositories.slice(0, 10) // Return top 10 repos
      };
      
    } catch (error: any) {
      logger.error('[GITHUB-ADAPTER] Failed to fetch GitHub data', error);
      throw new Error(`GitHub fetch failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetch user profile
   */
  private async fetchProfile(username: string): Promise<GitHubProfile> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${username}`,
        { headers: this.headers }
      );
      
      const data = response.data;
      
      return {
        username: data.login,
        name: data.name,
        bio: data.bio,
        location: data.location,
        company: data.company,
        blog: data.blog,
        email: data.email,
        followers: data.followers,
        following: data.following,
        publicRepos: data.public_repos,
        publicGists: data.public_gists,
        createdAt: data.created_at,
        avatarUrl: data.avatar_url
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`GitHub user not found: ${username}`);
      }
      throw error;
    }
  }

  /**
   * Fetch user repositories
   */
  private async fetchRepositories(username: string): Promise<GitHubRepository[]> {
    try {
      const repos: GitHubRepository[] = [];
      let page = 1;
      const perPage = 100;
      const maxPages = 3; // Limit to 300 repos
      
      while (page <= maxPages) {
        const response = await axios.get(
          `${this.baseUrl}/users/${username}/repos`,
          {
            headers: this.headers,
            params: {
              sort: 'updated',
              direction: 'desc',
              per_page: perPage,
              page
            }
          }
        );
        
        if (response.data.length === 0) break;
        
        const pageRepos = response.data.map((repo: any) => ({
          name: repo.name,
          description: repo.description,
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          isPrivate: repo.private,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          topics: repo.topics || []
        }));
        
        repos.push(...pageRepos);
        
        if (response.data.length < perPage) break;
        page++;
      }
      
      // Sort by stars + forks for relevance
      return repos.sort((a, b) => 
        (b.stars + b.forks) - (a.stars + a.forks)
      );
      
    } catch (error) {
      logger.error('[GITHUB-ADAPTER] Failed to fetch repositories', error);
      return [];
    }
  }

  /**
   * Calculate GitHub statistics
   */
  private calculateStats(repositories: GitHubRepository[]): GitHubStats {
    const stats: GitHubStats = {
      totalStars: 0,
      totalForks: 0,
      totalContributions: 0,
      languages: {},
      topRepositories: [],
      contributionStreak: 0
    };
    
    // Calculate totals and language distribution
    for (const repo of repositories) {
      stats.totalStars += repo.stars;
      stats.totalForks += repo.forks;
      
      if (repo.language) {
        stats.languages[repo.language] = (stats.languages[repo.language] || 0) + 1;
      }
    }
    
    // Get top repositories
    stats.topRepositories = repositories
      .filter(repo => !repo.isPrivate)
      .slice(0, 5);
    
    // Note: Contribution data would require GraphQL API
    // This is a simplified version
    stats.totalContributions = repositories.length;
    
    return stats;
  }

  /**
   * Extract README content from a repository
   */
  async fetchReadme(username: string, repo: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${username}/${repo}/readme`,
        {
          headers: {
            ...this.headers,
            'Accept': 'application/vnd.github.v3.raw'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      logger.warn('[GITHUB-ADAPTER] README not found', { username, repo });
      return null;
    }
  }

  /**
   * Fetch language statistics for a repository
   */
  async fetchLanguageStats(username: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${username}/${repo}/languages`,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      logger.warn('[GITHUB-ADAPTER] Failed to fetch language stats', { username, repo });
      return {};
    }
  }
}