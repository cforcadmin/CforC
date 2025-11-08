/**
 * TypeScript Types for Strapi API Responses
 */

// Base Strapi response structure
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Strapi data wrapper
export interface StrapiData<T> {
  id: number;
  attributes: T;
}

// Activity type - matches Strapi schema exactly
export interface Activity {
  Title: string;
  Description: any;  // Strapi blocks type (rich text)
  Date: string;
  Visuals?: StrapiMediaArray;  // Multiple images/files
  Category?: string;
  Featured?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Hero Section type
export interface HeroSection {
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundImage?: StrapiMedia;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Page type
export interface Page {
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Strapi Media/Image type (single)
export interface StrapiMedia {
  data: {
    id: number;
    attributes: {
      name: string;
      alternativeText?: string;
      caption?: string;
      width: number;
      height: number;
      formats?: {
        thumbnail?: MediaFormat;
        small?: MediaFormat;
        medium?: MediaFormat;
        large?: MediaFormat;
      };
      url: string;
      previewUrl?: string;
      provider: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

// Strapi Media/Image type (array for multiple images)
export interface StrapiMediaArray {
  data: Array<{
    id: number;
    attributes: {
      name: string;
      alternativeText?: string;
      caption?: string;
      width: number;
      height: number;
      formats?: {
        thumbnail?: MediaFormat;
        small?: MediaFormat;
        medium?: MediaFormat;
        large?: MediaFormat;
      };
      url: string;
      previewUrl?: string;
      provider: string;
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}
