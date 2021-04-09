import fsExtra from "fs-extra";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { Artifact, Artifacts, ProjectPathsConfig } from "hardhat/types";
import path from "path";
import yulp from "yulp";

import { YulpConfig } from "./types";

const ARTIFACT_FORMAT_VERSION = "hh-yulp-artifact-1";

export async function compile(
  vyperConfig: YulpConfig,
  paths: ProjectPathsConfig,
  artifacts: Artifacts
) {
  const files = await getYulpSources(paths);

  let someContractFailed = false;

  const sources: any = {};
  const abis: any = {};

  for (const file of files) {
    const pathFromCWD = path.relative(process.cwd(), file);
    const pathFromSources = path.relative(paths.sources, file);

    console.log("Compiling", pathFromCWD);
    
    const sourceCode = await fsExtra.readFile(file, 'utf8');
    const source = yulp.compile(sourceCode);

    const content = yulp.print(source.results);
    sources[pathFromSources] = { content };
    abis[pathFromSources] = generateABI(source.signatures, source.topics);
  }

  if (someContractFailed) {
    throw new NomicLabsHardhatPluginError(
      "@nomiclabs/hardhat-yulp",
      "Compilation failed"
    );
  }

  const input = {
    language: "Yul",
    sources,
    settings: {
      outputSelection: { "*": { "*": ["*"], "": [ "*" ] } },
      optimizer: { enabled: true, details: { yul: true } }
    }
  }

  return { input, abis };
}

async function getYulpSources(paths: ProjectPathsConfig) {
  const glob = await import("glob");
  const yulpFiles = glob.sync(path.join(paths.sources, "**", "*.yulp"));

  return yulpFiles;
}

const functionRegex = /sig"([\w\d_]+)\(([\w\d, \[\]]*)\)(?: public)?(?: external)?(?: (view))?(?: returns \(([\w\d, \[\]]+)\))?"/;
const paramRegex = /([\w\d\[\]]+)(?: memory| external)?( [\w\d]+)?/;
const eventRegex = /topic"event ([\w\d_]+)\(([\w\d, \[\]]*)\)"/;
const eventParamRegex = /([\w\d\[\]]+)( indexed)?( [\w\d]+)?/;

function fixType(type: string) {
  if (type === 'uint') {
    return 'uint256';
  }
  if (type === 'int') {
    return 'int256';
  }
  return type;
}

function generateABI(signatures: any[], topics: any[]) {
  const abi: any[] = [
    {
      inputs: [],
      stateMutability: "nonpayable",
      type: "constructor"
    }
  ];

  for (const signature of signatures) {
    const [_, fnName, inputs, view, outputs] = Array.from(functionRegex.exec(signature.abi)!);

    const inputElements = inputs !== '' ? inputs.split(',') : [];
    const outputElements = outputs && outputs !== '' ? outputs.split(',') : [];

    abi.push({
      inputs: inputElements.map((input: string) => {
        const [__, type, paramName] = Array.from(paramRegex.exec(input.trim())!);
        return { name: paramName, type: fixType(type), internalType: fixType(type) };
      }),
      name: fnName,
      outputs: outputElements.map((input: string) => {
        const [__, type, paramName] = Array.from(paramRegex.exec(input.trim())!);
        return { name: paramName, type: fixType(type), internalType: fixType(type) };
      }),
      stateMutability: view ? 'view' : 'payable',
      type: 'function',
    });
  }

  for (const topic of topics) {
    const [_, eventName, inputs] = Array.from(eventRegex.exec(topic.abi)!);
    const inputElements = inputs && inputs !== '' ? inputs.split(',') : [];

    abi.push({
      anonymous: false,
      inputs: inputElements.map((input: string) => {
        const [__, type, indexed, paramName] = Array.from(eventParamRegex.exec(input.trim())!);

        return {
          indexed: !!indexed,
          name: paramName.trim(),
          type: fixType(type),
          internalType: fixType(type),
        };
      }),
      name: eventName,
      type: 'event',
    });
  }
  return abi;
}

function add0xPrefixIfNecessary(hex: string): string {
  hex = hex.toLowerCase();

  if (hex.slice(0, 2) === "0x") {
    return hex;
  }

  return `0x${hex}`;
}

export async function saveArtifacts(output: any, abis: any, artifacts: Artifacts) {
  console.log(abis);
  for (const [sourceName, file] of Object.entries(output.contracts)) {
    console.log(sourceName);
    for (const [contractName, contractResult] of Object.entries(file as any)) {
      const artifact = {
        _format: ARTIFACT_FORMAT_VERSION,
        contractName,
        sourceName,
        abi: abis[sourceName] || [],
        bytecode: add0xPrefixIfNecessary((contractResult as any).evm.bytecode.object),
        deployedBytecode: add0xPrefixIfNecessary((contractResult as any).evm.deployedBytecode.object),
        linkReferences: {},
        deployedLinkReferences: {},
      };

      await artifacts.saveArtifactAndDebugFile(artifact);
    }
  }
}
