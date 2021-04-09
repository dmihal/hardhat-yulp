import { TASK_COMPILE_GET_COMPILATION_TASKS } from "hardhat/builtin-tasks/task-names";
import { extendConfig, subtask } from "hardhat/internal/core/config/config-env";

import "./type-extensions";

export const TASK_COMPILE_YULP = "compile:yulp";

extendConfig((config) => {
  const defaultConfig = { version: "latest" };
  config.yulp = { ...defaultConfig, ...config.yulp };
});

subtask(
  TASK_COMPILE_GET_COMPILATION_TASKS,
  async (_, __, runSuper): Promise<string[]> => {
    const otherTasks = await runSuper();
    return [...otherTasks, TASK_COMPILE_YULP];
  }
);

const YUL_WARNING = 'Yul is still experimental. Please use the output with care.';

subtask(TASK_COMPILE_YULP, async (_, { config, artifacts, run }) => {
  const { compile, saveArtifacts } = await import("./compilation");

  const solcBuild: any = await run(
    'compile:solidity:solc:get-build', {
      quiet: false,
      solcVersion: config.solidity.compilers[0].version,
    }
  );

  // This plugin is experimental, so this task isn't split into multiple
  // subtasks yet.
  const { input, abis } = await compile(config.yulp, config.paths, artifacts);
  const output = await run('compile:solidity:solc:run', { input, solcPath: solcBuild.compilerPath });

  if (output.errors && output.errors.filter((error: any) => error.message !== YUL_WARNING).length > 0) {
    for (const error of output.errors) {
      console.error(error.formattedMessage);
    }
    return;
  }

  await saveArtifacts(output, abis, artifacts);
});
