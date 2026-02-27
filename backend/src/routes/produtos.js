import { Router } from 'express'
import { authApiKey } from '../middleware/authApiKey.js'
import { makeRateLimiter } from '../middleware/rateLimit.js'
import { index, show, store, update, destroy } from '../controllers/produtosController.js'

const router = Router()
router.use(authApiKey)
router.use(makeRateLimiter())
router.get('/', index)
router.get('/:id', show)
router.post('/', store)
router.put('/:id', update)
router.delete('/:id', destroy)

export default router
