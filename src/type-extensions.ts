import "hardhat/types/config";

import { YulpConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    yulp?: Partial<YulpConfig>;
  }

  interface HardhatConfig {
    yulp: YulpConfig;
  }
}
