declare module 'react-scroll' {
  export interface LinkProps {
    to: string;
    smooth?: boolean;
    duration?: number;
    offset?: number;
    className?: string;
    onClick?: () => void;
    children?: React.ReactNode;
  }

  export const Link: React.FC<LinkProps>;
  
  export const animateScroll: {
    scrollTo: (target: string | number, options?: { smooth?: boolean; duration?: number; offset?: number }) => void;
    scrollToTop: (options?: { smooth?: boolean; duration?: number }) => void;
  };
}