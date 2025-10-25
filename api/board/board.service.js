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

async function removeGroup(boardId, groupId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(boardId) }

        const collection = await dbService.getCollection('board')
        const updatedBoard = await collection.findOneAndUpdate(
            criteria,
            { $pull: { groups: { id: groupId } } },
            { returnDocument: 'before' }
        )

        const deletedGroup = updatedBoard.groups.find(group => group.id === groupId);
        const miniDeletedGroup = { id: deletedGroup.id, title: deletedGroup.title }

        return miniDeletedGroup
    } catch (err) {
        logger.error(`cannot remove group ${groupId} from board ${boardId}`, err)
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