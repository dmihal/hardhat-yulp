# Yul+ for Hardhat - hardhat-yulp

Hardhat plugin for building smart contracts using [Yul+](https://github.com/FuelLabs/yulp).

## Installation

First install the plugin using `yarn add -D hardhat-yulp` or `npm install --save-dev hardhat-yulp`.

Next, add the following to your `hardhat.config.js` file:

```javascript
require("hardhat-yulp");
```

Or if you're using TypeScript, add:

```typescript
import "hardhat-yulp";
```

## Usage

To use, simply create a file in your `contracts` directory with the file extension `.yulp`.

Short example:

```javascript
object "HelloWorldYulp" {
  code {
    // Goto runtime.
    datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
    return(0, datasize("Runtime"))
  }
  object "Runtime" {
    code {
      const _calldata := 128 // leave first 4 32 byte chunks for hashing, returns etc..
      calldatacopy(_calldata, 0, calldatasize()) // copy all calldata to memory.

      switch mslice(_calldata, 4) // 4 byte calldata signature.

      case sig"helloView() public view returns (string)" {
        mstore(0, 0x20)

        let length := 11
        mstore(0x20, length)
        mstore(0x40, "Hello World")

        return(0, 0x60)
      }

      case sig"helloEvent() public" {
        log2(0, 0, topic"event HelloWorld(address indexed caller)", caller())
      }


      default { require(0) } // invalid method signature.

      stop() // stop execution here..
    }
  }
}
```

## ABI Generation

As a low-level language, Yul+ does not have high-level functions and events that can be used to generate an ABI. Instead, an ABI is generated using functions from `sig` statements and events from `topic` statements.

This plugin generates a constructor interface with 0 paramaters.
