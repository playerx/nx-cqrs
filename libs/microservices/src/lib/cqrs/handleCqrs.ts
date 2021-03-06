import { Transport, TransportItem } from '@cheep/transport'
import { filter } from 'rxjs/operators'
import { constructRouteKey } from '../utils/constructRouteKey'
import { decodeRpc } from '../utils/decodeRpc'
import { encodeRpc } from '../utils/encodeRpc'
import { CqrsType } from './constants'
import {
  CqrsApi,
  Handler,
  HandlerArg,
  HandlerMap,
  RpcMetadata,
} from './types'

/**
 *
 * @param type the CQRS type to handle for
 * @param transport a valid CQRS transport
 * @param handlers either a single function, an array of functions, or an object (optionally recursive)
 * with leaf values which are functions.
 *
 * _All functions __must__ be async or return a Promise_
 * @param keyPrefix
 */

export function handleCqrsSingle<
  TApi extends CqrsApi<string, HandlerMap, HandlerMap>,
  TTransport extends Transport<RpcMetadata> = Transport<RpcMetadata>
>(
  type: CqrsType,
  transport: TTransport,
  handlers: HandlerArg,
  namespace: TApi['namespace'],
) {
  const keys = buildRecursiveHandler(
    type,
    transport,
    namespace,
    handlers,
  )
  if (keys.length === 0) {
    transport.listenPatterns(keys)
  }
}

export function handleCqrsApi<
  TApi extends CqrsApi<string, HandlerMap, HandlerMap>,
  TTransport extends Transport<RpcMetadata> = Transport<RpcMetadata>
>(transport: TTransport, api: TApi) {
  const queryKeys = buildRecursiveHandler(
    CqrsType.Query,
    transport,
    api.namespace,
    api[CqrsType.Query],
  )
  if (queryKeys.length === 0) {
    transport.listenPatterns(queryKeys)
  }

  const commandKeys = buildRecursiveHandler(
    CqrsType.Command,
    transport,
    api.namespace,
    api[CqrsType.Command],
  )
  if (commandKeys.length === 0) {
    transport.listenPatterns(commandKeys)
  }
}

/**
 * internal recursive function to build the handler tree
 * @param type @see handleCqrsSingle
 * @param transport @see handleCqrsSingle
 * @param handlers @see handleCqrsSingle
 * @param moduleName string of the module name
 * @param keyPrefix an array of key prefixes, used to track recursion depth
 */
function buildRecursiveHandler(
  type: CqrsType,
  transport: Transport<RpcMetadata>,
  moduleName: string,
  handlers: HandlerArg,
  keyPrefix: string[] = [],
): string[] {
  let routeKeys: string[]
  switch (true) {
    // handlers is an array
    case Array.isArray(handlers):
      {
        routeKeys = (handlers as Handler[]).map(h =>
          buildSingleHandler(type, transport, moduleName, h),
        )
      }
      break
    // handler is single function
    case typeof handlers === 'function':
      routeKeys = [
        buildSingleHandler(
          type,
          transport,
          moduleName,
          handlers as Handler,
          keyPrefix.length ? keyPrefix : [(handlers as Handler).name],
        ),
      ]
      break
    // it is safe to check object here, we have caught array above
    case typeof handlers === 'object':
      routeKeys = Object.entries(handlers as HandlerMap).flatMap(
        ([key, handler]) =>
          // call handle recursively, adding the object key to the keyPrefix array to track depth
          buildRecursiveHandler(
            type,
            transport,
            moduleName,
            handler,
            keyPrefix.concat([key]),
          ),
      )
      break
    default:
      break
  }
  return routeKeys
}

function buildSingleHandler<T extends Handler>(
  type: CqrsType,
  transport: Transport<RpcMetadata>,
  moduleName: string,
  handler: T,
  keyPrefix: string[] = [],
): string {
  const routeKey = constructRouteKey({
    moduleName,
    busType: type,
    functionName: keyPrefix,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  transport.message$
    .pipe(filter(t => t.route === routeKey))
    .subscribe(transportItem => {
      const handlerArgs = decodeRpc(transportItem.message as string)
        // NOTE: add the metadata object on the end for utility
        .concat([transportItem.metadata])

      switch (type) {
        case CqrsType.Query:
          {
            // ack the message immediately
            transportItem.complete(true)
            try {
              handler(...handlerArgs)
                .then(result => {
                  // for now, just sending the original metadata back
                  // TODO(kb): determine whether to send different metadata
                  sendReply(transportItem)(result)
                })
                .catch(sendError(transportItem))
            } catch (error) {
              // this catch is just in case the handler throws a sync error
              sendError(transportItem)(error)
            }
          }
          break
        case CqrsType.Command:
          {
            handler(...handlerArgs)
              .then(result => {
                transportItem.complete(true)
                if (result) {
                  sendReply(transportItem)(result)
                }
              })
              .catch(err => {
                transportItem.complete(false)
                sendError(transportItem)(err)
              })
          }
          break
      }
    })
  return routeKey
}

// helpers per transport item
const sendError = (
  transportItem: TransportItem<RpcMetadata>,
) => error => transportItem.sendErrorReply(error)
// helper
const sendReply = (
  transportItem: TransportItem<RpcMetadata>,
) => result =>
  transportItem.sendReply(encodeRpc(result), {
    ...transportItem.metadata,
    replyTime: new Date().toISOString(),
  })
