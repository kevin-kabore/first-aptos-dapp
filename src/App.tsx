import React from 'react'
import {Types, AptosClient} from 'aptos'

import './App.css'

// Create an AptosClient to interact with testnet
const client = new AptosClient('https://fullnode.testnet.aptoslabs.com/v1')
const MESSAGE_ABI_NAME = 'message'

// a function that converts strings to hex-encoded utf-8 bytes
function stringToHex(text: string): string {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(text)
  return encoded.reduce((acc, i) => acc + i.toString(16).padStart(2, '0'), '')
  // eq => return Array.from(encoded, (i) => i.toString(16).padStart(2, '0')).join('')
}

// a function that converts hex-encoded utf-8 bytes to strings
function hexToString(hex: string): string {
  return decodeURIComponent(
    hex.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&'),
  )
}

function App() {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [address, setAddress] = React.useState<string | null>(null)
  const [account, setAccount] = React.useState<Types.AccountData | null>(null)
  const [modules, setModules] = React.useState<Types.MoveModuleBytecode[]>([])
  const [isSaving, setIsSaving] = React.useState(false)
  const [refetch, setRefetch] = React.useState(0)
  const [resources, setResources] = React.useState<Types.MoveResource[]>([])
  // Retrieve aptos.account on initial render and store it.
  const urlAdrress = window.location.pathname.slice(1)
  const isEditable = !urlAdrress

  React.useEffect(() => {
    /*** init function*/
    const init = async () => {
      const {address} = await window.aptos.connect() // connect
      setAddress(address)
    }
    init()
  }, [])

  React.useEffect(() => {
    if (!address) return
    client.getAccount(address).then(setAccount)
  }, [address])

  // Check for the message module for the address; show publish instructions if not present.
  React.useEffect(() => {
    if (!address) return
    client.getAccountModules(address).then(setModules)
  }, [address, refetch])

  // Get the message from account resources.
  React.useEffect(() => {
    if (!address) return
    client.getAccountResources(address).then(setResources)
  }, [address, refetch])

  React.useEffect(() => {
    if (urlAdrress) {
      setAddress(urlAdrress)
    } else {
      window.aptos
        .account()
        .then((data: {address: string}) => setAddress(data.address))
    }
  }, [urlAdrress])

  // Call set_message with the textarea value on submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ref.current) return

    const message = ref.current.value
    const hexEncodedMessage = stringToHex(message)
    const transaction = {
      type: 'entry_function_payload',
      function: `${address}::message::set_message`,
      arguments: [hexEncodedMessage],
      type_arguments: [],
    }

    try {
      setIsSaving(true)
      await window.aptos.signAndSubmitTransaction(transaction)
    } finally {
      setIsSaving(false)
      setRefetch(refetch + 1)
    }
  }
  // currently this

  const hasModules = modules.some(
    module => module.abi?.name === MESSAGE_ABI_NAME,
  )
  const resourceType = `${address}::message::MessageHolder`
  const resource = resources.find(r => r.type === resourceType)
  const data = resource?.data as {message: string} | undefined
  const message = data?.message

  return (
    <div className="App">
      {!hasModules ? (
        <pre>
          Run this command to publish the module:
          <br />
          aptos move publish --package-dir /path/to/hello_blockchain/
          --named-addresses HelloBlockchain={address}
        </pre>
      ) : (
        <form onSubmit={handleSubmit}>
          <textarea ref={ref} defaultValue={message} readOnly={!isEditable} />
          {isEditable && <input disabled={isSaving} type="submit" />}
          {isEditable && <a href={address!}>Get public URL</a>}
        </form>
      )}
    </div>
  )
}

export default App
