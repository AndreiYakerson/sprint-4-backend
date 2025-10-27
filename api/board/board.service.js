import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const boardService = {
    remove,
    query,
    getById,
    add,
    update,
    addBoardMsg,
    removeBoardMsg,
    // group
    addGroup,
    removeGroup,
    updateGroup,
    updateGroupOrder,
    // task details
    getTaskById,
    // task
    addTask,
    duplicateTask,
    updateTask,
    removeTask,
    // dashboard
    getDashboardData
}

async function query(filterBy = { txt: '' }) {
    try {
        // const criteria = _buildCriteria(filterBy)
        // const sort = _buildSort(filterBy)

        const collection = await dbService.getCollection('board')
        const miniBoards = await collection.find({}, { projection: { _id: 1, title: 1, isStarred: 1 } })
        const boards = await miniBoards.toArray()
        return boards
    } catch (err) {
        logger.error('cannot find boards', err)
        throw err
    }
}

async function getById(boardId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(boardId) }

        const collection = await dbService.getCollection('board')
        const board = await collection.findOne(criteria)

        board.createdAt = board._id.getTimestamp()
        return board
    } catch (err) {
        logger.error(`while finding board ${boardId}`, err)
        throw err
    }
}

async function remove(boardId) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: ownerId, isAdmin } = loggedinUser

    try {
        const criteria = {
            _id: ObjectId.createFromHexString(boardId),
        }
        if (!isAdmin) criteria['owner._id'] = ownerId

        const collection = await dbService.getCollection('board')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw ('Not your board')
        return boardId
    } catch (err) {
        logger.error(`cannot remove board ${boardId}`, err)
        throw err
    }
}

async function add(board) {

    try {
        const collection = await dbService.getCollection('board')
        await collection.insertOne(board)

        return board
    } catch (err) {
        logger.error('cannot insert board', err)
        throw err
    }
}

async function update(board) {
    const { _id, ...boardToSave } = board

    try {
        const criteria = { _id: new ObjectId(board._id.$oid) }
        const collection = await dbService.getCollection('board')
        delete boardToSave._id
        await collection.updateOne(criteria, { $set: boardToSave })
        return board
    } catch (err) {
        logger.error(`cannot update board ${board._id}`, err)
        throw err
    }
}

async function addBoardMsg(boardId, msg) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(boardId) }
        msg.id = makeId()

        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $push: { msgs: msg } })

        return msg
    } catch (err) {
        logger.error(`cannot add board msg ${boardId}`, err)
        throw err
    }
}

async function removeBoardMsg(boardId, msgId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(boardId) }

        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

        return msgId
    } catch (err) {
        logger.error(`cannot remove board msg ${boardId}`, err)
        throw err
    }
}

/// groups functions

export async function addGroup(boardId, newGroup) {
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: ObjectId.createFromHexString(boardId) }

        const add = { $push: { groups: newGroup } }

        await collection.updateOne(criteria, add)

        return newGroup

    } catch (err) {
        console.error('Failed to add group to board', err)
        throw err
    }
}

export async function updateGroup(boardId, updatedGroup) {
    try {
        const collection = await dbService.getCollection('board')

        const criteria = {
            _id: ObjectId.createFromHexString(boardId),
            'groups.id': updatedGroup.id
        };


        const update = {
            $set: {
                'groups.$': updatedGroup
            }
        };

        await collection.updateOne(criteria, update)

        return updatedGroup
    } catch (err) {
        console.error('Failed to add group to board', err)
        throw err
    }
}

export async function updateGroupOrder(boardId, orderedGroups) {
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: ObjectId.createFromHexString(boardId) }

        const update = {
            $set: {
                groups: orderedGroups
            }
        }

        await collection.updateOne(criteria, update)

        return orderedGroups
    } catch (err) {
        console.error('Failed to update group order in board', err)
        throw err
    }
}

async function removeGroup(boardId, groupId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(boardId) }

        const collection = await dbService.getCollection('board')
        const updatedBoard = await collection.findOneAndUpdate(
            criteria,
            { $pull: { groups: { id: groupId } } },
            { returnDocument: 'before' }
        )

        const deletedGroup = updatedBoard.groups.find(group => group.id === groupId)
        const miniDeletedGroup = { id: deletedGroup.id, title: deletedGroup.title }

        return miniDeletedGroup
    } catch (err) {
        logger.error(`cannot remove group ${groupId} from board ${boardId}`, err)
        throw err
    }
}

// task details

async function getTaskById(boardId, taskId) {
    try {
        const collection = await dbService.getCollection('board')

        const pipeline = [
            { $match: { _id: ObjectId.createFromHexString(boardId) } },
            { $unwind: '$groups' },
            { $unwind: '$groups.tasks' },
            { $match: { 'groups.tasks.id': taskId } },
            {
                $project: {
                    _id: 0,
                    id: '$groups.tasks.id',
                    title: '$groups.tasks.title',
                    groupId: '$groups.id',
                    createdAt: '$groups.tasks.createdAt',
                    updates: '$groups.tasks.updates',

                    activities: {
                        $filter: {
                            input: '$activities',
                            as: 'activity',
                            cond: { $eq: ['$$activity.task.id', taskId] }
                        }
                    }
                }
            },
            { $sort: { 'activities.createdAt': -1 } }
        ]

        const result = await collection.aggregate(pipeline).toArray()

        if (!result.length) throw new Error(`Task ${taskId} not found`)

        return result[0]

    } catch (err) {
        console.error('cannot get task', err)
        throw err
    }
}

/// task 

async function addTask(boardId, groupId, task, method = 'push') {
    console.log('METHOD:',method);
    
    
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: ObjectId.createFromHexString(boardId), 'groups.id': groupId }

        let add
        if (method === 'unshift') {
            add = {
                $push: {
                    'groups.$.tasks': {
                        $each: [task],
                        $position: 0
                    }
                }
            }
        } else {
            add = { $push: { 'groups.$.tasks': task } }
        }

        await collection.updateOne(criteria, add)

        return task
    } catch (err) {
        console.error('cannot add task', err)
        throw err
    }
}

async function duplicateTask(boardId, groupId, taskCopy, taskCopyIdx) {
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: ObjectId.createFromHexString(boardId), 'groups.id': groupId }
        const addCopy = {
            $push: {
                'groups.$.tasks': {
                    $each: [taskCopy],
                    $position: +taskCopyIdx
                }
            }
        }

        const result = await collection.updateOne(criteria, addCopy)

        if (!result.matchedCount) throw new Error(`Board ${boardId} or group ${groupId} not found`)

        return taskCopy

    } catch (err) {
        throw err
    }
}

async function updateTask(boardId, groupId, taskId, task) {
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: ObjectId.createFromHexString(boardId) }
        const update = {
            $set: Object.fromEntries(
                Object.entries(task).map(([key, value]) => [
                    `groups.$[g].tasks.$[t].${key}`,
                    value
                ])
            )
        }
        const options = {
            arrayFilters: [
                { 'g.id': groupId },
                { 't.id': taskId }
            ],
            returnDocument: 'after'
        }

        await collection.findOneAndUpdate(criteria, update, options)

        return task
    } catch (err) {
        console.error('cannot update task', err)
        throw err
    }
}


async function removeTask(boardId, groupId, task) {
    try {
        const criteria = {
            _id: ObjectId.createFromHexString(boardId),
            'groups.id': groupId
        }

        const collection = await dbService.getCollection('board')
        const updatedBoard = await collection.findOneAndUpdate(
            criteria,
            { $pull: { 'groups.$.tasks': { id: taskId } } },
            { returnDocument: 'before' }
        )

        if (!updatedBoard.value) {
            throw new Error(`Board with id ${boardId} or group with id ${groupId} not found`)
        }


        const group = updatedBoard.groups.find(group => group.id === groupId)
        const deletedTask = group.tasks.find(task => task.id === taskId)

        return deletedTask
    } catch (err) {
        console.error('cannot add task', err)
        throw err
    }
}

//// dashboard

export async function getDashboardData(filterBy = {}) {
    try {
        const collection = await dbService.getCollection('board')

        const pipeline = [
            { $unwind: '$groups' },
            { $unwind: '$groups.tasks' },


            {
                $project: {
                    status: '$groups.tasks.status',
                    memberIds: '$groups.tasks.memberIds'
                }
            },

            {
                $addFields: {
                    memberIds: {
                        $map: {
                            input: '$memberIds',
                            as: 'id',
                            in: {
                                $cond: {
                                    if: { $regexMatch: { input: '$$id', regex: /^[0-9a-fA-F]{24}$/ } },
                                    then: { $toObjectId: '$$id' },
                                    else: '$$id'
                                }
                            }
                        }
                    }
                }
            },


            {
                $facet: {

                    tasksCount: [{ $count: 'total' }],


                    byStatus: [
                        {
                            $group: {
                                _id: '$status.id',
                                txt: { $first: '$status.txt' },
                                cssVar: { $first: '$status.cssVar' },
                                tasksCount: { $sum: 1 }
                            }
                        }
                    ],


                    byMember: [
                        { $unwind: { path: '$memberIds', preserveNullAndEmptyArrays: false } },
                        {
                            $group: {
                                _id: '$memberIds',
                                tasksCount: { $sum: 1 }
                            }
                        }
                    ]
                }
            },


            { $unwind: { path: '$byMember', preserveNullAndEmptyArrays: true } },


            {
                $lookup: {
                    from: 'user',
                    localField: 'byMember._id',
                    foreignField: '_id',
                    as: 'byMember.userInfo'
                }
            },


            {
                $set: {
                    'byMember.userInfo': { $arrayElemAt: ['$byMember.userInfo', 0] }
                }
            },


            {
                $group: {
                    _id: null,
                    tasksCount: { $first: '$tasksCount' },
                    byStatus: { $first: '$byStatus' },
                    byMember: { $push: '$byMember' }
                }
            }
        ]

        const [result] = await collection.aggregate(pipeline).toArray()

        const tasksCount = result?.tasksCount?.[0]?.total || 0

        const byStatus = result.byStatus.map(s => ({
            id: s._id,
            txt: s.txt,
            cssVar: s.cssVar,
            tasksCount: s.tasksCount,
            tasksPercentage: parseFloat(((s.tasksCount / tasksCount) * 100).toFixed(1))
        }))

        const byMember = result.byMember.map(m => ({
            memberId: m._id,
            fullname: m.userInfo?.fullname || 'Unknown',
            imgUrl: m.userInfo?.imgUrl || '',
            tasksCount: m.tasksCount,
            tasksPercentage: parseFloat(((m.tasksCount / tasksCount) * 100).toFixed(1))
        }))

        return { tasksCount, byStatus, byMember }

    } catch (err) {
        console.error('Failed to build dashboard data:', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {
        title: { $regex: filterBy.txt, $options: 'i' },
    }

    return criteria
}

function _buildSort(filterBy) {
    if (!filterBy.sortField) return {}
    return { [filterBy.sortField]: filterBy.sortDir }
}