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

  for (const file of files) {
    const pathFromCWD = path.relative(process.cwd(), file);
    const pathFromSources = path.relative(paths.sources, file);

    console.log("Compiling", pathFromCWD);
    
    const sourceCode = await fsExtra.readFile(file, 'utf8');
    const source = yulp.compile(sourceCode);

    const content = yulp.print(source.results);

    const input = {
      "language": "Yul",
      "sources": { "input2.yul": { content } },
      "settings": {
        "outputSelection": { "*": { "*": ["*"], "": [ "*" ] } },
        "optimizer": { "enabled": true, "details": { "yul": true } }
      }
    }
    return input;
  }

  if (someContractFailed) {
    throw new NomicLabsHardhatPluginError(
      "@nomiclabs/hardhat-yulp",
      "Compilation failed"
    );
  }
}

async function getYulpSources(paths: ProjectPathsConfig) {
  const glob = await import("glob");
  const yulpFiles = glob.sync(path.join(paths.sources, "**", "*.yulp"));

  return yulpFiles;
}

function add0xPrefixIfNecessary(hex: string): string {
  hex = hex.toLowerCase();

  if (hex.slice(0, 2) === "0x") {
    return hex;
  }

  return `0x${hex}`;
}

export async function saveArtifacts(output: any, artifacts: Artifacts) {
  for (const [sourceName, file] of Object.entries(output.contracts)) {
    for (const [contractName, contractResult] of Object.entries(file as any)) {
      const artifact = {
        _format: ARTIFACT_FORMAT_VERSION,
        contractName,
        sourceName,
        abi: [],
        bytecode: add0xPrefixIfNecessary((contractResult as any).evm.bytecode.object),
        deployedBytecode: add0xPrefixIfNecessary((contractResult as any).evm.deployedBytecode.object),
        linkReferences: {},
        deployedLinkReferences: {},
      };

      await artifacts.saveArtifactAndDebugFile(artifact);
    }
  }
}
