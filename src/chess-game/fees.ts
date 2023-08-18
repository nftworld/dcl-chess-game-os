import * as l2 from '@dcl/l2-scene-utils'
import * as ethConnect from 'eth-connect'
import { getUserData } from '@decentraland/Identity'

import config from './config'

import type { IMANAComponents } from 'node_modules/@dcl/l2-scene-utils/dist/mana'

export class FeeProvider {
  mana?: IMANAComponents

  async init() {
    const { mana } = await l2.createComponents()
    this.mana = mana
  }

  async getBalance(address: string) {
    if (!this.mana) throw new Error('FeeProvider not initialized')
    return await this.mana.balance(address)
  }

  async requestFee(fee: number = config.fees.entryFee, payoutAddress: string = config.fees.escrowAddress) {
    if (!this.mana) throw new Error('FeeProvider not initialized')
    if (config.fees.skip) return { txId: '0xDEADBEEFCAFE' }
    let result
    try {
      const user = await getUserData()
      if (!user?.hasConnectedWeb3 || !user?.publicKey) throw new Error('User is not connected')
      const wei = await this.getBalance(user.publicKey)
      const balance = ethConnect.fromWei(wei, 'ether')
      if (parseFloat(balance) < fee) return { error: 'Insufficient Polygon MANA' }

      try {
        result = await this.mana?.transfer(payoutAddress, new ethConnect.BigNumber(ethConnect.toWei(fee, 'ether')), {
          serverURL: config.fees.metaTxServer
        })

        return { txId: result }
      } catch (err: any) {
        log('tx:err', err)
        return { error: err?.message || 'Transaction failed', result }
      }
    } catch (err: any) {
      log(err?.message || err)
      return { error: err?.message || 'Transaction failed', result }
    }
  }

  async registerUser(address: string) {
    if (!this.mana) throw new Error('FeeProvider not initialized')
    try {
      if (!config.fees.skip) {
        const wei = await this.getBalance(address)
        const balance = ethConnect.fromWei(wei, 'ether')
        if (parseFloat(balance) < config.fees.entryFee) return { error: 'Insufficient Polygon MANA' }
      }

      const tx: any = await this.requestFee(config.fees.entryFee)
      if (!tx?.txId && !config.fees.skip) throw new Error('Transaction failed')
      return tx
    } catch (err: any) {
      log(err.message)
      return { error: err.message }
    }
  }
}
