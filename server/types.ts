export interface Theme {
  thumbnails: string[];
  name: string;
  author: string;
  createdAt?: Date;
  extra?: {
    url: string;
    authors: { name: string; url: string }[];
    opengraph: string;
  };
}
