import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
    getBoards, getBoardById, addBoard, updateBoard, removeBoard, addBoardMsg, removeBoardMsg,
    removeGroup, addGroup,
    addTask, updateTask, removeTask, duplicateTask
} from './board.controller.js'


const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getBoards)
router.get('/:id', log, getBoardById)
router.post('/', log, requireAuth, addBoard)
router.put('/', requireAuth, updateBoard)
router.delete('/:id', requireAuth, removeBoard)

// group
router.post('/:boardId', requireAuth, addGroup)
router.delete('/:boardId/:groupId', requireAuth, removeGroup)

//task
router.post('/:boardId/:groupId', requireAuth, addTask)
router.post('/:boardId/:groupId/duplicate/:taskCopyIdx', requireAuth, duplicateTask)
router.put('/:boardId/:groupId/:taskId', requireAuth, updateTask)
router.delete('/:boardId/:groupId/:taskId', requireAuth, removeTask)

// router.delete('/:id', requireAuth, requireAdmin, removeBoard)

router.post('/:id/msg', requireAuth, addBoardMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeBoardMsg)

export const boardRoutes = router