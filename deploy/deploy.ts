import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedRegistry = await deploy("EncryptedJobRegistry", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedJobRegistry contract: `, deployedRegistry.address);
};
export default func;
func.id = "deploy_encrypted_job_registry"; // id required to prevent reexecution
func.tags = ["EncryptedJobRegistry"];
