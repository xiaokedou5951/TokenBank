// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/MyToken.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";

contract MyTokenERC165Test is Test {
    MyToken public token;

    function setUp() public {
        token = new MyToken(1000000000);
    }

    function testSupportsIERC165() public {
        // ERC165 interface ID
        assertTrue(token.supportsInterface(0x01ffc9a7), "Should support ERC165");
    }

    function testSupportsIERC20() public {
        // ERC20 interface ID
        assertTrue(token.supportsInterface(type(IERC20).interfaceId), "Should support ERC20");
    }

    function testDoesNotSupportERC721() public {
        // ERC721 interface ID
        assertFalse(token.supportsInterface(0x80ac58cd), "Should not support ERC721");
    }

    function testDoesNotSupportInvalidInterface() public {
        // Invalid interface ID (per ERC165 spec should return false)
        assertFalse(token.supportsInterface(0xffffffff), "Should not support invalid interface");
    }
}