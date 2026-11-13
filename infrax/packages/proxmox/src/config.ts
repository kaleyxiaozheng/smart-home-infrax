import * as fs from "node.fs";
import * as os from "node.os";
import * as path from "node.path";
import * as pulumi from "@pulumi/pulumi";
import * as yaml from "js-yaml";

/** Non-secret values from configs/environments/<stack>.yaml */
export interface EnvironmentConfig {
  proxmoxEndpoint: string;
  nodeName: string;
  templateName: string;
  vmId: number;
  datastore: string;
  cloudImageFileId: string;
  diskSizeGb: number;
  memoryMb: number;
  cpuCores: number;
  cpuSockets: number;
  networkBridge: string;
  username: string;
}

const REQUIRED_KEYS: (keyof EnvironmentConfig)[] = [
  "proxmoxEndpoint",
  "nodeName",
  "templateName",
  "vmId",
  "datastore",
  "cloudImageFileId",
  "diskSizeGb",
  "memoryMb",
  "cpuCores",
  "cpuSockets",
  "networkBridge",
  "username",
];

function expandHome(p: string): string {
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function readTextFile(p: string): string {
  return fs.readFileSync(expandHome(p), "utf8").trim();
}

function environmentFile(stack: string): string {
  return path.join(process.cwd(), "configs", "environments", `${stack}.yaml`);
}

export function loadEnvironment(stack: string): EnvironmentConfig {
  const file = environmentFile(stack);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing environment file ${file}. Add configs/environments/${stack}.yaml for this stack`,
    );
  }

  const parsed = yaml.load(fs.readFileSync(file, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${file} must be a YAML mapping`);
  }

  const record = parsed as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter((key) => record[key] === undefined || record[key] === null);
  if (missing.length > 0) {
    throw new Error(`${file} is missing: ${missing.join(", ")}`);
  }

  return record as unknown as EnvironmentConfig;
}

/** 
 * Secrets and local key paths. Set with:
 *   pulumi config set --secret proxmoxApiToken 'root@pam!pulumi=TOKEN'
 *   pulumi config set sshPublicKeyPath ~/.ssh/id_ed25519.pub
 *   pulumi config set sshprivatekeyPath ~/.ssh/id_ed25519
 */
export function loadSecrets() {
  const config = new pulumi.Config();
  const sshPublickeyPath = config.get("sshPublicKeyPath") ?? "~/.ssh/id_ed25519.pub";
  const sshPrivatekeyPath = config.get("sshPrivatekeyPath") ?? "~/.ssh/id_ed25519";

  return {
    proxmoxApiToken: config.requireSecret("proxmoxApiToken"),
    sshPublickeyPath: readTextFile(sshPublickeyPath),
    sshPrivatekeyPath: readTextFile(sshPrivatekeyPath),
  };
}