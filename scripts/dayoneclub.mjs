import {
  createPublicClient,
  fallback,
  getAddress,
  http,
  parseAbi,
} from 'viem'
import { writeFile } from 'fs/promises'
import path from 'path'
import { normalize } from 'viem/ens'
import { mainnet } from 'viem/chains'
import * as LibMoonCatModule from './lib/libmooncat.js'

const LibMoonCat =
  LibMoonCatModule.default?.default ??
  LibMoonCatModule.default ??
  LibMoonCatModule['module.exports'] ??
  LibMoonCatModule

const PUBLIC_RPC_URLS = [
  'https://ethereum-rpc.publicnode.com',
  'https://cloudflare-eth.com',
  'https://eth.merkle.io',
]
const CONTRACT_ADDRESS = '0x60cd862c9C687A9dE49aecdC3A99b74A4fc54aB6'
const TRAITS_ADDR = '0x9330BbfBa0C8FdAf0D93717E4405a410a6103cC2'
const DELEGATE_XYZ_REGISTRY_ADDR = '0x00000000000000447e69651d841bD8D104Bed493'
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'members.json')

const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(PUBLIC_RPC_URLS.map((url) => http(url))),
})

async function getAddressMetadata(address) {
  const ensName = await publicClient.getEnsName({
    address,
  })

  if (ensName === null) return null

  const [twitter, name, favourite] = await Promise.all([
    publicClient.getEnsText({
      name: normalize(ensName),
      key: 'com.twitter',
    }),
    publicClient.getEnsText({
      name: normalize(ensName),
      key: 'name',
    }),
    publicClient.getEnsText({
      name: normalize(ensName),
      key: 'mooncat',
    }),
  ])

  return {
    ensName,
    twitter: twitter ?? undefined,
    name: name ?? undefined,
    favourite:
      typeof favourite === 'string' && favourite.length > 0
        ? Number(favourite)
        : undefined,
  }
}

function hasRichMetadata(metadata) {
  return (
    metadata !== null &&
    (typeof metadata.twitter === 'string' || typeof metadata.name === 'string')
  )
}

function nameFromBytes(byteStr) {
  const bytes = byteStr.substring(2).match(/.{1,2}/g)

  if (bytes === null || bytes.length === 0) return false

  const byteArray = new Uint8Array(
    bytes.map((byte) => parseInt(byte, 16)).filter((byte) => byte > 0),
  )
  const name = new TextDecoder().decode(byteArray)

  return name.length > 0 ? name : false
}

async function getOwnerOfRescueIndex(rescueIndex) {
  try {
    const ownerAddress = await publicClient.readContract({
      address: TRAITS_ADDR,
      abi: parseAbi(['function ownerOf(uint256) public view returns (address)']),
      functionName: 'ownerOf',
      args: [BigInt(rescueIndex)],
    })

    return ownerAddress
  } catch (error) {
    console.warn('ownerOf failed', error)
    return false
  }
}

async function getCatName(catId) {
  try {
    const nameBytes = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: parseAbi(['function catNames(bytes5) view returns (bytes32)']),
      functionName: 'catNames',
      args: [catId],
    })

    return nameFromBytes(nameBytes)
  } catch (error) {
    console.warn('fetchName failed', error)
    return false
  }
}

async function getOutgoingDelegations(address) {
  const data = await publicClient.readContract({
    address: DELEGATE_XYZ_REGISTRY_ADDR,
    abi: parseAbi([
      'function getOutgoingDelegations(address from) view returns ((uint8 type_, address to, address from, bytes32 rights, address contract_, uint256 tokenId, uint256 amount)[] delegations_)',
    ]),
    functionName: 'getOutgoingDelegations',
    args: [getAddress(address)],
  })

  return [
    ...new Set(
      data
        .filter((delegation) => delegation.contract_ === CONTRACT_ADDRESS)
        .map((delegation) => getAddress(delegation.to)),
    ),
  ]
}

async function main() {
  const dayOneOwners = []

  for (let rescueIndex = 0; rescueIndex <= 491; rescueIndex++) {
    const ownerAddress = await getOwnerOfRescueIndex(rescueIndex)

    if (ownerAddress === false) continue

    dayOneOwners.push({
      rescueIndex,
      ownerAddress: getAddress(ownerAddress),
    })
  }

  const uniqueOwners = [
    ...new Set(dayOneOwners.map((entry) => entry.ownerAddress)),
  ]
  const metadataByAddress = new Map()
  const results = []

  for (const ownerAddress of uniqueOwners) {
    let ownerMetadata = metadataByAddress.get(ownerAddress)

    if (typeof ownerMetadata === 'undefined') {
      ownerMetadata = await getAddressMetadata(ownerAddress)
      metadataByAddress.set(ownerAddress, ownerMetadata)
    }

    let selectedMetadata = ownerMetadata
    let delegated = false

    if (ownerMetadata === null || !hasRichMetadata(ownerMetadata)) {
      const delegatedAddresses = await getOutgoingDelegations(ownerAddress)

      for (const delegatedAddress of delegatedAddresses) {
        let delegatedMetadata = metadataByAddress.get(delegatedAddress)

        if (typeof delegatedMetadata === 'undefined') {
          delegatedMetadata = await getAddressMetadata(delegatedAddress)
          metadataByAddress.set(delegatedAddress, delegatedMetadata)
        }

        if (hasRichMetadata(delegatedMetadata)) {
          selectedMetadata = delegatedMetadata
          delegated = true
          break
        }
      }
    }

    if (selectedMetadata === null) continue

    if (!delegated && ownerMetadata !== null && !hasRichMetadata(ownerMetadata)) {
      // Keep plain ENS-only owner metadata if no richer delegation metadata was found.
      selectedMetadata = ownerMetadata
    }

    const favourite =
      typeof ownerMetadata?.favourite === 'number'
        ? ownerMetadata.favourite
        : typeof selectedMetadata.favourite === 'number'
          ? selectedMetadata.favourite
          : undefined

    for (const entry of dayOneOwners.filter(
      (ownerEntry) => ownerEntry.ownerAddress === ownerAddress,
    )) {
      results.push({
        rescueIndex: entry.rescueIndex,
        ownerAddress: entry.ownerAddress,
        ensName: selectedMetadata.ensName,
        ...(typeof selectedMetadata.twitter === 'string'
          ? { twitter: selectedMetadata.twitter }
          : {}),
        ...(typeof selectedMetadata.name === 'string'
          ? { name: selectedMetadata.name }
          : {}),
        ...(typeof favourite === 'number' ? { favourite } : {}),
        ...(delegated ? { delegated: true } : {}),
      })
    }
  }

  const finalResults = [...results].reduce((map, entry) => {
      const existing = map.get(entry.ownerAddress)

      if (typeof existing === 'undefined') {
        map.set(entry.ownerAddress, entry)
        return map
      }

      const favouriteMatchesEntry =
        typeof entry.favourite === 'number' && entry.favourite === entry.rescueIndex
      const favouriteMatchesExisting =
        typeof existing.favourite === 'number' &&
        existing.favourite === existing.rescueIndex

      if (favouriteMatchesEntry && !favouriteMatchesExisting) {
        map.set(entry.ownerAddress, entry)
        return map
      }

      if (
        favouriteMatchesEntry === favouriteMatchesExisting &&
        entry.rescueIndex < existing.rescueIndex
      ) {
        map.set(entry.ownerAddress, entry)
      }

      return map
    }, new Map())

  const enrichedResults = await Promise.all(
    [...finalResults.values()].map(async (entry) => {
      const catId = LibMoonCat.getCatId(entry.rescueIndex)
      const catName = await getCatName(catId)
      
      return {
        ...entry,
        ...(typeof catId === 'string' ? { catId } : {}),
        ...(typeof catName === 'string' ? { catName } : {}),
      }
    }),
  )

  await writeFile(OUTPUT_PATH, `${JSON.stringify(enrichedResults, null, 2)}\n`, 'utf8')
  console.log(`Saved ${enrichedResults.length} members to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
