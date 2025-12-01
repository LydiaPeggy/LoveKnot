import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedLoveKnot = await deploy("LoveKnot", {
    from: deployer,
    log: true,
  });

  console.log(`LoveKnot contract: `, deployedLoveKnot.address);
};
export default func;
func.id = "deploy_loveKnot"; // id required to prevent reexecution
func.tags = ["LoveKnot"];


