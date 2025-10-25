import express from 'express'

import { requireAuth, requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import { getUser, getUsers, deleteUser, updateUser } from './user.controller.js'

const router = express.Router()

router.get('/', getUsers)
router.get('/:id', getUser)
router.put('/:id', requireAuth, updateUser)
// Set for production.  No authentication needed.
router.delete('/:id',  deleteUser)

// When authentication and admin will be applied, This is the real one 
// router.delete('/:id', requireAuth, requireAdmin, deleteUser)

export const userRoutes = router