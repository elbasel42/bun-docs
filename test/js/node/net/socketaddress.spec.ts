/**
 * @see https://nodejs.org/api/net.html#class-netsocketaddress
 */
import { SocketAddress } from "node:net";

describe("SocketAddress", () => {
  it("is named SocketAddress", () => {
    expect(SocketAddress.name).toBe("SocketAddress");
  });

  it("is newable", () => {
    // @ts-expect-error -- types are wrong. default is kEmptyObject.
    expect(new SocketAddress()).toBeInstanceOf(SocketAddress);
  });

  it("is not callable", () => {
    // @ts-expect-error -- types are wrong.
    expect(() => SocketAddress()).toThrow(TypeError);
  });
  describe.each([new SocketAddress(), new SocketAddress(undefined), new SocketAddress({})])(
    "new SocketAddress()",
    address => {
      it("creates an ipv4 address", () => {
        expect(address.family).toBe("ipv4");
      });

      it("address is 127.0.0.1", () => {
        expect(address.address).toBe("127.0.0.1");
      });

      it("port is 0", () => {
        expect(address.port).toBe(0);
      });

      it("flowlabel is 0", () => {
        expect(address.flowlabel).toBe(0);
      });
    },
  ); // </new SocketAddress()>

  describe("new SocketAddress({ family: 'ipv6' })", () => {
    let address: SocketAddress;
    beforeAll(() => {
      address = new SocketAddress({ family: "ipv6" });
    });
    it("creates a new ipv6 loopback address", () => {
      expect(address).toMatchObject({
        address: "::1",
        port: 0,
        family: "ipv6",
        flowlabel: 0,
      });
    });
  }); // </new SocketAddress({ family: 'ipv6' })>
}); // </SocketAddress>

describe("SocketAddress.isSocketAddress", () => {
  it("is a function that takes 1 argument", () => {
    expect(SocketAddress).toHaveProperty("isSocketAddress");
    expect(SocketAddress.isSocketAddress).toBeInstanceOf(Function);
    expect(SocketAddress.isSocketAddress).toHaveLength(1);
  });

  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress, "isSocketAddress");
    expect(desc).toEqual({
      value: expect.any(Function),
      writable: true,
      enumerable: false,
      configurable: true,
    });
  });
});

describe("SocketAddress.parse", () => {
  it("is a function that takes 1 argument", () => {
    expect(SocketAddress).toHaveProperty("parse");
    expect(SocketAddress.parse).toBeInstanceOf(Function);
    expect(SocketAddress.parse).toHaveLength(1);
  });

  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress, "parse");
    expect(desc).toEqual({
      value: expect.any(Function),
      writable: true,
      enumerable: false,
      configurable: true,
    });
  });
});

describe("SocketAddress.prototype.address", () => {
  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress.prototype, "address");
    expect(desc).toEqual({
      get: expect.any(Function),
      set: undefined,
      enumerable: false,
      configurable: true,
    });
  });
});

describe("SocketAddress.prototype.port", () => {
  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress.prototype, "port");
    expect(desc).toEqual({
      get: expect.any(Function),
      set: undefined,
      enumerable: false,
      configurable: true,
    });
  });
});

describe("SocketAddress.prototype.family", () => {
  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress.prototype, "family");
    expect(desc).toEqual({
      get: expect.any(Function),
      set: undefined,
      enumerable: false,
      configurable: true,
    });
  });
});

describe("SocketAddress.prototype.flowlabel", () => {
  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress.prototype, "flowlabel");
    expect(desc).toEqual({
      get: expect.any(Function),
      set: undefined,
      enumerable: false,
      configurable: true,
    });
  });
});

describe("SocketAddress.prototype.toJSON", () => {
  it("is a function that takes 0 arguments", () => {
    expect(SocketAddress.prototype).toHaveProperty("toJSON");
    expect(SocketAddress.prototype.toJSON).toBeInstanceOf(Function);
    expect(SocketAddress.prototype.toJSON).toHaveLength(0);
  });

  it("has the correct property descriptor", () => {
    const desc = Object.getOwnPropertyDescriptor(SocketAddress.prototype, "toJSON");
    expect(desc).toEqual({
      value: expect.any(Function),
      writable: true,
      enumerable: false,
      configurable: true,
    });
  });

  describe("When called on a default SocketAddress", () => {
    let address: Record<string, any>;
    beforeEach(() => {
      address = new SocketAddress().toJSON();
    });

    it("returns an object with an address, port, family, and flowlabel", () => {
      expect(address).toEqual({
        address: "127.0.0.1",
        port: 0,
        family: "ipv4",
        flowlabel: 0,
      });
    });

    it("SocketAddress.isSocketAddress() returns false", () => {
      expect(SocketAddress.isSocketAddress(address)).toBeFalse();
    });

    it("does not have SocketAddress as its prototype", () => {
      expect(Object.getPrototypeOf(address)).not.toBe(SocketAddress.prototype);
      expect(address instanceof SocketAddress).toBeFalse();
    });
  }); // </When called on a default SocketAddress>
}); // </SocketAddress.prototype.toJSON>
