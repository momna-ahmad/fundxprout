import { expect } from "chai";
import { ethers } from "hardhat";

describe("EquitySecondaryMarketplace", function () {
  async function deployFixture() {
    const [owner, treasury, seller, buyer] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("TestERC20");
    const token = await Token.deploy("Test", "TST");
    const Marketplace = await ethers.getContractFactory("EquitySecondaryMarketplace");
    const marketplace = await Marketplace.deploy(treasury.address);
    const amount = ethers.parseUnits("10", 18);
    const price = ethers.parseEther("0.01");
    await token.mint(seller.address, ethers.parseUnits("100", 18));
    await token.connect(seller).approve(await marketplace.getAddress(), ethers.MaxUint256);
    return { owner, treasury, seller, buyer, token, marketplace, amount, price };
  }

  it("escrows a sell order and settles it from an escrowed buy order", async function () {
    const { treasury, seller, buyer, token, marketplace, amount, price } = await deployFixture();
    const total = (amount * price) / ethers.WeiPerEther;
    const fee = (total * 200n) / 10_000n;

    await marketplace.connect(seller).createSellOrder(await token.getAddress(), amount, price);
    await marketplace.connect(buyer).createBuyOrder(await token.getAddress(), amount, price, { value: total });

    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    await expect(marketplace.matchOrders(1, 2, amount)).to.emit(marketplace, "OrderMatched");

    expect(await token.balanceOf(buyer.address)).to.equal(amount);
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(treasuryBefore + fee);
    expect((await marketplace.orders(1)).active).to.equal(false);
    expect((await marketplace.orders(2)).active).to.equal(false);
  });

  it("returns escrowed assets when an order is cancelled", async function () {
    const { seller, buyer, token, marketplace, amount, price } = await deployFixture();
    const total = (amount * price) / ethers.WeiPerEther;
    const sellerBefore = await token.balanceOf(seller.address);

    await marketplace.connect(seller).createSellOrder(await token.getAddress(), amount, price);
    await marketplace.connect(seller).cancelOrder(1);
    expect(await token.balanceOf(seller.address)).to.equal(sellerBefore);

    await marketplace.connect(buyer).createBuyOrder(await token.getAddress(), amount, price, { value: total });
    await expect(marketplace.connect(buyer).cancelOrder(2)).to.changeEtherBalances(
      [buyer, marketplace],
      [total, -total]
    );
  });

  it("rejects matches whose prices do not cross", async function () {
    const { seller, buyer, token, marketplace, amount, price } = await deployFixture();
    await marketplace.connect(seller).createSellOrder(await token.getAddress(), amount, price);
    const lowerPrice = ethers.parseEther("0.009");
    const total = (amount * lowerPrice) / ethers.WeiPerEther;
    await marketplace.connect(buyer).createBuyOrder(await token.getAddress(), amount, lowerPrice, { value: total });
    await expect(marketplace.matchOrders(1, 2, amount)).to.be.revertedWith("Prices do not cross");
  });
});
