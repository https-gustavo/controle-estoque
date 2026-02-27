import pinoHttp from 'pino-http'

export const logger = pinoHttp({
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        id: req.requestId,
      }
    },
    res(res) {
      return {
        statusCode: res.statusCode
      }
    }
  }
})
