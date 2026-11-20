import express from 'express';
import productsRouter from './routes/products.router.js';
import usersRouter from './routes/users.router.js';
import mocksRouter from './routes/mocks.router.js';
import ordersRouter from './routes/orders.router.js';
import deliveriesRouter from './routes/deliveries.router.js';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi.js';
import { RouteNotFoundError } from './errors/domain-errors.js';
import { errorHandler } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import loggerRouter from './routes/logger.router.js';
import healthRouter from './routes/health.router.js';

const app = express();

app.use(requestLogger);
app.use('/api/health', healthRouter);
app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/mocks', mocksRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);
const publicDocs = (_req, _res, next) => process.env.ENABLE_SWAGGER === 'false' ? next(new RouteNotFoundError()) : next();
app.get('/api/docs/openapi.json', publicDocs, (req, res) => res.status(200).json(openapiSpec));
app.use('/api/docs', publicDocs, swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));
app.use('/api/logger', loggerRouter);

app.use((req, res, next) => next(new RouteNotFoundError()));

app.use(errorHandler);

export default app;
