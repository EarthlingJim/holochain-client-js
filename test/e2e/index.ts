const test = require('tape')

import { AdminWebsocket } from '../../src/websocket/admin'
import { AppWebsocket } from '../../src/websocket/app'
import { withConductor } from './util'
import { AgentPubKey, fakeAgentPubKey } from '../../src/api/types'

const ADMIN_PORT = 33001

test(
  'admin smoke test',
  withConductor(ADMIN_PORT, async (t) => {
    const app_id = 'app'
    const admin = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`)

    const agent_key = await admin.generateAgentPubKey()
    t.ok(agent_key)

    await admin.installApp({
      app_id,
      agent_key,
      dnas: [],
    })

    await admin.activateApp({ app_id })
    await admin.attachAppInterface({ port: 0 })
    await admin.deactivateApp({ app_id })
    const dnas = await admin.listDnas()
    t.equal(dnas.length, 0)
    // NB: missing dumpState because it requires a valid cell_id
  })
)

test(
  'can call a zome function',
  withConductor(ADMIN_PORT, async (t) => {
    const app_id = 'app'
    const admin = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`)
    const agent = await admin.generateAgentPubKey()
    const app = await admin.installApp({
      app_id,
      agent_key: agent,
      dnas: [
        {
          path: 'test/e2e/fixture/test.dna.gz',
          nick: 'mydna',
        },
      ],
    })
    t.equal(app.cell_data.length, 1)
    const cellId = app.cell_data[0][0]

    await admin.activateApp({ app_id })

    const { port: appPort } = await admin.attachAppInterface({ port: 0 })

    const client = await AppWebsocket.connect(`http://localhost:${appPort}`)

    const info = await client.appInfo({ app_id })
    t.deepEqual(info.cell_data[0][0], cellId)
    t.equal(info.cell_data[0][1], 'mydna')

    const response = await client.callZome({
      // TODO: write a test with a real capability secret.
      cap: null,
      cell_id: cellId,
      zome_name: 'foo',
      fn_name: 'foo',
      provenance: fakeAgentPubKey('TODO'),
      payload: null,
    })
    t.equal(response, 'foo')
  })
)

test(
  'callZome rejects appropriately for ZomeCallUnauthorized',
  withConductor(ADMIN_PORT, async (t) => {
    const app_id = 'app'
    const admin = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`)
    const agent = await admin.generateAgentPubKey()
    const app = await admin.installApp({
      app_id,
      agent_key: agent,
      dnas: [
        {
          path: 'test/e2e/fixture/test.dna.gz',
          nick: 'mydna',
        },
      ],
    })
    const cellId = app.cell_data[0][0]
    await admin.activateApp({ app_id })
    const { port: appPort } = await admin.attachAppInterface({ port: 0 })
    const client = await AppWebsocket.connect(`http://localhost:${appPort}`)
    try {
      await client.callZome({
        // bad cap, on purpose
        cap: Buffer.from(
          // 64 bytes
          '0000000000000000000000000000000000000000000000000000000000000000'
            .split('')
            .map((x) => parseInt(x, 10))
        ),
        cell_id: cellId,
        zome_name: 'foo',
        fn_name: 'bar',
        provenance: fakeAgentPubKey('TODO'),
        payload: null,
      })
    } catch (e) {
      t.deepEqual(e, { type: 'ZomeCallUnauthorized' })
    }
  })
)

// no conductor
test('error is catchable when holochain socket is unavailable', async (t) => {
  const url = `http://localhost:${ADMIN_PORT}`
  try {
    await AdminWebsocket.connect(url)
  } catch (e) {
    t.equal(
      e.message,
      `could not connect to holochain conductor, please check that a conductor service is running and available at ${url}`
    )
  }

  try {
    await AppWebsocket.connect(url)
  } catch (e) {
    t.equal(
      e.message,
      `could not connect to holochain conductor, please check that a conductor service is running and available at ${url}`
    )
  }
})
