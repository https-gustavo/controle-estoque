import { Router } from 'express'
import produtos from './produtos.js'

const router = Router()
router.use('/produtos', produtos)

export default router
