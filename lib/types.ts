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

// Strapi data wrapper (Strapi v5 - no attributes wrapper)
export interface StrapiData<T> {
  id: number;
  documentId?: string;
}

// Activity type - matches Strapi schema exactly (Strapi v5)
export interface Activity extends StrapiData<Activity> {
  Title: string;
  Description: any;  // Strapi blocks type (rich text)
  Date: string;
  Visuals?: StrapiMediaArray;  // Multiple images/files
  Category?: string;
  Featured?: boolean;
  Slug?: string;  // URL-friendly slug generated from title
  ImageAltText: string;  // Required alt text for accessibility
  EngTitle?: string;  // Optional English title (manual translation)
  EngDescription?: any;  // Optional English description - Strapi blocks type (rich text)
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Single media object from Strapi v5
export interface StrapiMediaObject {
  id: number;
  documentId?: string;
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
}

// Open Call type - matches Strapi schema exactly (Strapi v5)
export interface OpenCall extends StrapiData<OpenCall> {
  Title: string;
  Deadline: string;
  Description: any;  // Strapi blocks type (rich text)
  Priority?: boolean;
  Link: string;
  Image?: StrapiMediaObject | StrapiMediaArray;  // Can be single object or array
  ImageAltText: string;  // Required alt text for accessibility
  EngTitle?: string;  // Optional English title (manual translation)
  EngDescription?: any;  // Optional English description - Strapi blocks type (rich text)
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Newsletter type - matches Strapi schema
export interface Newsletter extends StrapiData<Newsletter> {
  Title: string;
  Date: string;
  DriveLink: string;
  Slug: string;
  Image?: StrapiMediaObject | StrapiMediaArray;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Partner component (used in Project)
export interface Partner {
  id: number;
  name: string;
  logo?: StrapiMediaObject;
  url?: string;
}

// External Link component (used in Project)
export interface ExternalLink {
  id: number;
  label: string;
  url: string;
}

// Project type - matches Strapi schema (Strapi v5)
export interface Project extends StrapiData<Project> {
  title: string;
  slug: string;
  CforC_project_role?: string;
  project_partners?: string;  // comma-separated, parsed on frontend
  full_description?: any;  // Strapi blocks type (rich text)
  cover_image?: StrapiMediaObject | StrapiMediaArray;
  project_images?: StrapiMediaArray;
  project_link?: string;
  project_status?: 'active' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  category?: string;  // comma-separated, parsed on frontend
  sort_order?: number;
  featured?: boolean;
  partners?: Partner[];
  external_links?: ExternalLink[];
  project_entries?: ProjectEntry[];
  supporters_banner_light?: StrapiMediaObject | StrapiMediaArray;
  supporters_banner_dark?: StrapiMediaObject | StrapiMediaArray;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// ΣΗΜΑ Entry type - matches Strapi schema (Strapi v5)
export interface ProjectEntry extends StrapiData<ProjectEntry> {
  title: string;
  slug: string;
  description?: any;  // Strapi blocks type (rich text)
  cover_image?: StrapiMediaObject | StrapiMediaArray;
  images?: StrapiMediaArray;
  category?: string;
  tags?: string;  // comma-separated, parsed on frontend
  entry_link?: string;
  visibility?: 'public' | 'private';
  publication_date?: string;
  expiration_date?: string;
  project?: Project;
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

// Strapi Media/Image type (array for multiple images) - Strapi v5
export interface StrapiMediaArray extends Array<{
  id: number;
  documentId?: string;
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
}> {}

// Working Group member reference (populated relation)
export interface WorkingGroupMemberRef {
  id: number
  documentId?: string
  Name: string
  Slug: string
  Email?: string
  Image?: StrapiMediaObject[] | StrapiMediaArray
  ProfileImageAltText?: string
  HideProfile?: boolean
}

// Working Group type - matches Strapi schema (Strapi v5)
export interface WorkingGroup extends StrapiData<WorkingGroup> {
  Name: string
  EngName?: string
  Description: string
  EngDescription?: string
  Image?: StrapiMediaObject | StrapiMediaArray
  ImageAltText?: string
  Coordinator?: WorkingGroupMemberRef
  Members?: WorkingGroupMemberRef[]
  SortOrder?: number
  Slug: string
  createdAt: string
  updatedAt: string
  publishedAt: string
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
