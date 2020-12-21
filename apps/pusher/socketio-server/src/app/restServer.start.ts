import * as bodyParser from 'body-parser'
import * as express from 'express'
import { NextFunction, Request, Response } from 'express'

export function restServerStart() {
  const app = express()
  const startedAt = Date.now()

  app.use((_: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    res.header('Access-Control-Allow-Headers', 'Content-Type')

    next()
  })

  app.use(bodyParser.json({ limit: '50mb' }))
  app.set('json spaces', 3)

  app.get('/', (_: Request, res: Response) =>
    res.json({
      status: 'Online',
      startedAt,
    }),
  )

  return app
}
