declare module 'hpp' {
  import { RequestHandler } from 'express';
  
  interface HppOptions {
    whitelist?: string | string[];
    checkQuery?: boolean;
    checkBody?: boolean;
    checkBodyOnlyForContentType?: string;
  }
  
  function hpp(options?: HppOptions): RequestHandler;
  
  export = hpp;
}

declare module 'express-mongo-sanitize' {
  import { RequestHandler } from 'express';
  
  interface SanitizeOptions {
    replaceWith?: string;
    allowDots?: boolean;
    dryRun?: boolean;
    onSanitize?: (data: { req: any; key: string }) => void;
  }
  
  function mongoSanitize(options?: SanitizeOptions): RequestHandler;
  
  export = mongoSanitize;
}
