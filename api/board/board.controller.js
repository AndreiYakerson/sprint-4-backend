import { logger } from '../../services/logger.service.js'
import { boardService } from './board.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { makeId, getRandomGroupColor, getRandomIntInclusive } from '../../services/util.service.js'
import { socketService } from '../../services/socket.service.js'

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
    const { boardId, filterByStr } = req.params
    const defaultFilterBy = _getDefaultFilterBy()
    const filterBy = filterByStr === 'undefined' ? defaultFilterBy : JSON.parse(filterByStr)

    try {
        const board = await boardService.getById(boardId, filterBy)
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
        board.members.push(loggedinUser)
        console.log(board);

        const addedBoard = await boardService.add(board)

        socketService.broadcast({
            type: 'event-update-board',
            data: board,
            room: board.id,
            userId: loggedinUser?._id
        })

        res.json(addedBoard)
    } catch (err) {
        logger.error('Failed to add board', err)
        res.status(400).send({ err: 'Failed to add board' })
    }
}

export async function updateBoard(req, res) {
    const { loggedinUser, body: board } = req

    // const { _id: userId, isAdmin } = loggedinUser
    const boardId = board.id
    // if (!isAdmin && board.owner._id !== userId) {
    //     res.status(403).send('Not your board...')
    //     return
    // }
    try {
        const updatedBoard = await boardService.update(board)

        socketService.broadcast({
            type: 'event-update-board',
            data: updatedBoard,
            room: boardId,
            userId: loggedinUser?._id
        })

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
    console.log('YES');

    const { boardId } = req.params
    const { loggedinUser } = asyncLocalStorage.getStore()
    const group = _getEmptyGroup()


    try {
        group.owner = loggedinUser

        console.log(group);

        const addedGroup = await boardService.addGroup(boardId, group)

        res.json(addedGroup)
    } catch (err) {
        logger.error('Failed to add group', err)
        res.status(400).send({ err: 'Failed to add group' })
    }
}

export async function updateGroup(req, res) {
    const { boardId } = req.params
    const group = req.body
    const { loggedinUser } = asyncLocalStorage.getStore()

    try {
        const addedGroup = await boardService.updateGroup(boardId, group)

        socketService.broadcast({
            type: 'event-update-group',
            data: { addedGroup, boardId },
            room: boardId,
            userId: loggedinUser?._id
        })

        res.json(addedGroup)
    } catch (err) {
        logger.error('Failed to add group', err)
        res.status(400).send({ err: 'Failed to add group' })
    }
}

export async function updateGroupOrder(req, res) {
    const { boardId } = req.params
    const orderedGroups = req.body
    const { loggedinUser } = asyncLocalStorage.getStore()


    try {

        const addedGroup = await boardService.updateGroupOrder(boardId, orderedGroups)

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

function _getEmptyGroup() {
    return {
        id: makeId(),
        title: 'New group',
        createdAt: Date.now(),
        isCollapsed: false,
        tasks: [],
        style: {
            '--group-color': getRandomGroupColor(),
        },
    }
}

// task

export async function getTaskById(req, res) {
    const { boardId, taskId } = req.params
    const { loggedinUser } = req

    try {
        const taskDetails = await boardService.getTaskById(boardId, taskId)
        res.json(taskDetails)
    } catch (err) {
        logger.error('Failed to get task', err)
        res.status(400).send({ err: 'Failed to get task' })
    }
}


export async function addTask(req, res) {
    const { boardId, groupId } = req.params
    const { loggedinUser } = req
    const { title, method } = req.body
    const task = _getEmptyTask(title)
    try {
        task.owner = loggedinUser
        const addedTask = await boardService.addTask(boardId, groupId, task, method)

        socketService.broadcast({
            type: 'event-add-task',
            data: { addedTask, groupId, method },
            room: boardId,
            userId: loggedinUser?._id
        })


        res.json(addedTask)
    } catch (err) {
        logger.error('Failed to add task', err)
        res.status(400).send({ err: 'Failed to add task' })
    }
}

export async function duplicateTask(req, res) {
    const { boardId, groupId } = req.params
    const { loggedinUser } = req
    const { taskCopy } = req.body


    try {
        taskCopy.owner = loggedinUser
        const { duplicatedTask, taskCopyIdx } = await boardService.duplicateTask(boardId, groupId, taskCopy)

        socketService.broadcast({
            type: 'event-duplicate-task',
            data: { groupId, savedTask: duplicatedTask, taskCopyIdx },
            room: boardId,
            userId: loggedinUser?._id
        })

        res.json(duplicatedTask)
    } catch (err) {
        logger.error('Failed to duplicate task', err)
        res.status(400).send({ err: 'Failed to duplicate task' })
    }
}

export async function updateTask(req, res) {
    const { boardId, groupId, taskId } = req.params
    const { loggedinUser } = req
    const { taskToUpdate, activityTitle } = req.body

    try {

        const savedTask = await boardService.updateTask(boardId, groupId, taskId, taskToUpdate, activityTitle, loggedinUser)

        if (Array.isArray(taskToUpdate.memberIds)) {
            taskToUpdate.memberIds.forEach(userId => {
                socketService.emitToUser({
                    type: 'event-user-assigned',
                    data: {
                        boardId,
                        taskId,
                        taskTitle: savedTask.title,
                    },
                    userId,
                })
            })
        }
        socketService.broadcast({ type: 'event-update-task', data: savedTask, room: boardId, userId: loggedinUser?._id })

        res.json(savedTask)
    } catch (err) {
        logger.error('Failed to update task', err)
        res.status(400).send({ err: 'Failed to update task' })
    }
}

export async function addUpdate(req, res) {
    const { boardId, groupId, taskId } = req.params
    const { loggedinUser, body: UpdateTitle } = req

    try {
        const updatedTask = await boardService.addUpdate(boardId, groupId, taskId, UpdateTitle, loggedinUser)

        socketService.broadcast({
            type: 'event-add-update-msg',
            data: updatedTask,
            room: boardId,
            userId: loggedinUser?._id
        })

        res.json(updatedTask)

    } catch (err) {
        logger.error('Failed to add update to task', err)
        res.status(400).send({ err: 'Failed to add update to task' })
    }
}

export async function updateTasksOrder(req, res) {
    const { boardId, groupId } = req.params
    const { orderedTasks } = req.body
    const { loggedinUser } = req

    try {
        // delete task.id
        // console.log(orderedTasks);

        const updatedTaskOrder = await boardService.updateTaskOrder(boardId, groupId, orderedTasks)

        socketService.broadcast({
            type: 'event-update-tasks-order',
            data: { groupId, tasks: orderedTasks },
            room: boardId,
            userId: loggedinUser?._id
        })

        res.json(updatedTaskOrder)
    } catch (err) {
        logger.error('Failed to update task order', err)
        res.status(400).send({ err: 'Failed to update task order' })
    }
}

export async function removeTask(req, res) {
    const { boardId, groupId, taskId } = req.params
    const { loggedinUser } = req

    try {
        const deletedTask = await boardService.removeTask(boardId, groupId, taskId)

        socketService.broadcast({
            type: 'event-remove-task',
            data: { taskId, groupId },
            room: boardId,
            userId: loggedinUser?._id
        })

        res.json(deletedTask)
    } catch (err) {
        logger.error('Failed to add group', err)
        res.status(400).send({ err: 'Failed to add group' })
    }
}

function _getEmptyTask(title = 'New Task') {
    return {
        id: makeId(),
        title: title,
        createdAt: Date.now(),
        memberIds: [],
        priority: { txt: 'Default Label', cssVar: '--group-title-clr18', id: 'default' },
        status: { id: 'default', txt: 'Not Started', cssVar: '--group-title-clr18' },
        comments: []
    }
}

/// Dashboard

export async function getDashboardData(req, res) {
    const { loggedinUser } = req

    try {
        const dashboardData = await boardService.getDashboardData()

        res.json(dashboardData)
    } catch (err) {
        logger.error('Failed to get dashboard data', err)
        res.status(400).send({ err: 'Failed to get dashboard data' })
    }
}

function _getDefaultFilterBy() {
    return {
        byGroups: [],
        byNames: [],
        byStatuses: [],
        byPriorities: [],
        byMembers: [],
        byDueDateOp: [],
        byPerson: '',
        sortBy: '',
        dir: -1
    }
}
