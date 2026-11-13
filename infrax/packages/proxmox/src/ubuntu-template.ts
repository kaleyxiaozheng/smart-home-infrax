import { describe } from "node:test";
import type { EnvironmentConfig } from "./config";
import * as proxmoxve from "@muhlba91/pulumi-proxmoxve";

export interface UbuntuTemplateArgs extends EnvironmentConfig {
  sshPublicKey: string;
  templateName: string;
  nodeName: string;
  memoryMb: number;
}

/**
 * Creates an Ubuntu (noble) and marks it as a Proxmox template.
 * 
 * Prerequisites on the Proxmox host:
 * - Cloud image download, e.g. https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
 * - Datastore exists (default: local-lvm)
 * - API token with VM create / template privileges
 */
export function createUbuntuTemplate(
  cfg: UbuntuTemplateArgs,
  provider: proxmoxve.Provider,
): proxmoxve.VmLegacy {
  const image = new proxmoxve.download.File(
    "ubuntu-cloud-image",
    {
      contentType: "iso",
      datastoreId: cfg.imageDatastore,
      nodeName: cfg.nodeName,
      url: cfg.cloudImageUrl,
      fileName: cfg.cloudImageFileName,
      overwrite: false,
      overwriteUnmanaged: false,
    },
    { provider },
  );

  return new proxmoxve.VmLegacy(
    "ubuntu-template",
    {
      name: cfg.templateName,
      nodeName: cfg.nodeName,
      vmId: cfg.vmId,
      description: "Ubuntu cloud-image template",
      tags: ["template", "ubuntu"],
      template: true,
      started: false,
      onBoot: false,
      stopOnDestroy: true,

      memory: {
        dedicated: cfg.memoryMb,
      },

      cpu: {
        cores: cfg.cpuCores,
        sockets: cfg.cpuSockets,
        type: "host",
      },

      machine: "q35",
      bios: "ovmf",
      scsiHardware: "virtio-scsi-pci",
      operatingSystem: { type: "l26"},
      bootOrders: ["scsi0"],

      // ovmf (UEFI) needs an EFI disk or clones will not boot
      efiDisk: {
        datastoreId: cfg.datastore,
        type: "4m",
        fileFormat: "raw",
      },

      disks: [
        {
          datastoreId: cfg.datastore,
          fileId: image.id,
          interface: "scsi0",
          size: cfg.diskSizeGb,
          iothread: true,
          discard: "on",
        },
      ],

      networkDevices: [
        {
          bridge: cfg.networkBridge,
          model: "virtio",
          firewall: true,
        },
      ],

      // Ubuntu cloud image send the console to ttyS0
      serialDevices: [{ device: "socket" }],

      agent: {
        enabled: true,
        type: "virtio",
        // Template is never stared, so do not wait for a guest-agent IP
        waitForIp: { disabled: true },
      },

      // Cloud-Init drive: shows up in Proxmox Hardware as
      // "CloudInit Drive (ide2) local-lvm:vm-<id>-cloudinit"
      initialization: {
        datastoreId: cfg.datastore,
        interface: "ide2",
        userAccount: {
          username: cfg.username,
          keys: [cfg.sshPublicKey],
        },
        ipConfigs: [
          {
            ipv4: {
              address: "dhcp",
            },
          },
        ],
      },
    },
    { provider },
  );
}