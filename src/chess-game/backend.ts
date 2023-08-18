import { signedFetch } from '@decentraland/SignedFetch'
import config from './config'

export async function request(method: string, data?: any) {
  const response = await signedFetch(`${config.backend.url}/${method}`, {
    method: 'POST',
    responseBodyType: 'json',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(data || {})
    })
  })

  if (!response?.json) throw new Error(response.statusText)
  return response.json
}

export async function openGame(data: any) {
  return await request('openGame', data)
}

export async function recordUser(data: any) {
  return await request('recordUser', data)
}

export async function recordMove(data: any) {
  return await request('recordMove', data)
}

export async function startGame(data: any) {
  return await request('startGame', data)
}

export async function cancelEntry(id: number, floor: number) {
  return await request('cancelEntry', { id, floor })
}

export async function recordFinish(data: any) {
  return await request('recordFinish', data)
}

export async function finishGame(data: any) {
  return await request('finishGame', data)
}

export async function getGame(id: number, floor: number) {
  return await request('getGame', { id, floor })
}

export async function getUser(id: number) {
  return await request('getUser', { id })
}

export async function getStats() {
  return await request('getStats')
}

export async function getGames() {
  return await request('getGames')
}

export async function getCurrentGameId(floor: number) {
  return await request('getCurrentGameId', { floor })
}

export async function getCurrentGames() {
  return await request('getCurrentGames')
}

export async function undoRound(id: number, floor: number) {
  return await request('undoRound', { id, floor })
}

export async function reportBug(data: any) {
  return await request('reportBug', data)
}
