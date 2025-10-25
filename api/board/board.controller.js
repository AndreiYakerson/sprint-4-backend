import { logger } from '../../services/logger.service.js'
import { boardService } from './board.service.js'

export async function getBoards(req, res) {
    try {
        const filterBy = {
            txt: req.query.txt || '',
            // minSpeed: +req.query.minSpeed || 0,
            // sortField: req.query.sortField || '',
            // sortDir: req.query.sortDir || 1,
            // pageIdx: req.query.pageIdx,
        }

        const boards = await boardService.query(filterBy)
        res.json(boards)
    } catch (err) {
        logger.error('Failed to get boards', err)
        res.status(400).send({ err: 'Failed to get boards' })
    }
}

export async function getBoardById(req, res) {
    try {
        const boardId = req.params.id
        const board = await boardService.getById(boardId)
        res.json(board)
    } catch (err) {
        logger.error('Failed to get board', err)
        res.status(400).send({ err: 'Failed to get board' })
    }
}




export async function addBoard(req, res) {
    const { loggedinUser, body: board } = req

    try {
        board.owner = loggedinUser

        console.log(board);

        const addedBoard = await boardService.add(board)
        res.json(addedBoard)
    } catch (err) {
        logger.error('Failed to add board', err)
        res.status(400).send({ err: 'Failed to add board' })
    }
}

export async function updateBoard(req, res) {
    const { loggedinUser, body: board } = req

    // const { _id: userId, isAdmin } = loggedinUser

    // if (!isAdmin && board.owner._id !== userId) {
    //     res.status(403).send('Not your board...')
    //     return
    // }

    try {
        const updatedBoard = await boardService.update(board)
        res.json(updatedBoard)
    } catch (err) {
        logger.error('Failed to update board', err)
        res.status(400).send({ err: 'Failed to update board' })
    }
}

export async function removeBoard(req, res) {
    try {
        const boardId = req.params.id
        const removedId = await boardService.remove(boardId)

        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove board', err)
        res.status(400).send({ err: 'Failed to remove board' })
    }
}

export async function addBoardMsg(req, res) {
    const { loggedinUser } = req

    try {
        const boardId = req.params.id
        const msg = {
            txt: req.body.txt,
            by: loggedinUser,
        }
        const savedMsg = await boardService.addBoardMsg(boardId, msg)
        res.json(savedMsg)
    } catch (err) {
        logger.error('Failed to add board msg', err)
        res.status(400).send({ err: 'Failed to add board msg' })
    }
}

export async function removeBoardMsg(req, res) {
    try {
        const { id: boardId, msgId } = req.params

        const removedId = await boardService.removeBoardMsg(boardId, msgId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove board msg', err)
        res.status(400).send({ err: 'Failed to remove board msg' })
    }
}

// groups

export async function addGroup(req, res) {
    const { boardId } = req.params
    const { loggedinUser, body: group } = req

    try {
        group.owner = loggedinUser

        console.log(group);

        const addedGroup = await boardService.addGroup(boardId, group)

        console.log("🚀 ~ addedGroup:", addedGroup)
        res.json(addedGroup)
    } catch (err) {
        logger.error('Failed to add group', err)
        res.status(400).send({ err: 'Failed to add group' })
    }
}

export async function removeGroup(req, res) {

    try {
        const { boardId, groupId } = req.params

        const updatedBoard = await boardService.removeGroup(boardId, groupId)
        res.json(updatedBoard)
    } catch (err) {
        logger.error('Failed to remove group', err)
        res.status(400).send({ err: 'Failed to remove group' })
    }
}

// task

export async function getTaskById(req, res) {
    const { boardId, taskId } = req.params
    const { loggedinUser } = req

    try {
        const taskDetails = await boardService.getTaskById(boardId, taskId)

        console.log("🚀 ~ taskDetails:", taskDetails)
        res.json(taskDetails)
    } catch (err) {
        logger.error('Failed to get task', err)
        res.status(400).send({ err: 'Failed to get task' })
    }
}

// task

export async function addTask(req, res) {
    const { boardId, groupId, method } = req.params
    const { loggedinUser, body: task } = req

    try {
        task.owner = loggedinUser

        console.log(task);

        const addedTask = await boardService.addTask(boardId, groupId, task, method)

        console.log("🚀 ~ addedTask:", addedTask)
        res.json(addedTask)
    } catch (err) {
        logger.error('Failed to add task', err)
        res.status(400).send({ err: 'Failed to add task' })
    }
}

export async function duplicateTask(req, res) {
    const { boardId, groupId, taskCopyIdx } = req.params
    const { loggedinUser, body: taskCopy } = req

    try {
        taskCopy.owner = loggedinUser

        console.log(taskCopy);

        const duplicatedTask = await boardService.duplicateTask(boardId, groupId, taskCopy, taskCopyIdx)

        console.log("🚀 ~ duplicatedTask:", duplicatedTask)
        res.json(duplicatedTask)
    } catch (err) {
        logger.error('Failed to duplicate task', err)
        res.status(400).send({ err: 'Failed to duplicate task' })
    }
}

export async function updateTask(req, res) {
    const { boardId, groupId, taskId } = req.params
    const { loggedinUser, body: task } = req

    try {
        delete task.id
        console.log(task);

        const updatedTask = await boardService.updateTask(boardId, groupId, taskId, task)

        console.log("🚀 ~ updatedTask:", updatedTask)
        res.json(updatedTask)
    } catch (err) {
        logger.error('Failed to update task', err)
        res.status(400).send({ err: 'Failed to update task' })
    }
}

export async function removeTask(req, res) {
    const { boardId, groupId, taskId } = req.params
    const { loggedinUser } = req

    try {
        const deletedTask = await boardService.removeTask(boardId, groupId, task)
        res.json(deletedTask)
    } catch (err) {
        logger.error('Failed to add group', err)
        res.status(400).send({ err: 'Failed to add group' })
    }
}