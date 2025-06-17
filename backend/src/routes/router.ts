import { Express, Request, Response } from "express";
import { validateJWT as requiresAuth } from "../middleware/validateJWT";
import { error } from "../utils/logger/logger";

export type HttpMethod = "get" | "post" | "put" | "delete";

export type AsyncHandler<R> = (req: Request, res: Response<R>, next: () => void) => Promise<void>;

/**
 * Applies common security middleware to routes as well as
 * wrapping the route handlers to trap uncaught errors.
 *
 * This should be the only way of adding routes to Express.
 */
export class SecureRouter {
  private readonly app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Adds a route that requires authentication. The user must be logged in.
   * @param method
   * @param path
   * @param handlers
   */
  addRoute = <R>(
    method: HttpMethod,
    path: string,
    ...handlers: AsyncHandler<R>[]
  ) => {
    const trappedHandlers = handlers.map((h) => trapping(h));
    this.app[method](path, requiresAuth, ...trappedHandlers);
  }

  /**
   * Adds a route that does not require authentication. Anyone with access to the
   * API can access this route.
   * @param method
   * @param path
   * @param handlers
   */
  addUnauthenticatedRoute = <R>(
    method: HttpMethod,
    path: string,
    ...handlers: AsyncHandler<R>[]
  ) => {
    const trappedHandlers = handlers.map((h) => trapping(h));
    this.app[method](path, ...trappedHandlers);
  }
}

/**
 * Wraps the specified request `handler` to trap uncaught errors.
 * If an error is caught (or the handler's promise is rejected),
 * a message is logged and an HTTP 500 status is returned.
 * @param handler
 */
const trapping = <R>(handler: AsyncHandler<R>): AsyncHandler<R> =>
    async (req: Request, res: Response<R>, next: () => void) => {
      handler(req, res, next).catch((reason) => {
        error(`Uncaught error in ${req.method} ${req.url}`, reason);
        res.sendStatus(500);
      });
    };
