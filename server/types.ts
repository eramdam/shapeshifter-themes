export interface Theme {
  thumbnails: string[];
  name: string;
  author: string;
  extra?: {
    url: string;
    authors: { name: string; url: string }[];
  };
}
