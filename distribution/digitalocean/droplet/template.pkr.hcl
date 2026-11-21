# Packer template of the QR Code & Barcode Scanner 1-Click Droplet image for the DigitalOcean
# Marketplace, after github.com/digitalocean/marketplace-partners. It starts a build Droplet on
# Ubuntu 24.04, uploads this folder and the staged service, runs install.sh, then DigitalOcean's
# own cleanup and image check, and saves a snapshot. The build Droplet is destroyed at the end.
#
# From the root of the engine repository, with the owner's DigitalOcean token in the environment
# (never in a file):
#
#   python3 scripts/stage-http-satellite.py stage --out build/http
#   packer init distribution/digitalocean/droplet/template.pkr.hcl
#   DIGITALOCEAN_API_TOKEN=... packer build distribution/digitalocean/droplet/template.pkr.hcl
#
# distribution/digitalocean/LISTING.md has the owner's steps and costs.

packer {
  required_plugins {
    digitalocean = {
      source  = "github.com/digitalocean/digitalocean"
      version = "= 1.4.2"
    }
  }
}

variable "api_token" {
  type      = string
  default   = env("DIGITALOCEAN_API_TOKEN")
  sensitive = true
}

variable "service_dir" {
  type        = string
  default     = "build/http"
  description = "The tree scripts/stage-http-satellite.py wrote."
}

variable "region" {
  type    = string
  default = "nyc3"
}

locals {
  # The service version, read from the staged package.json, names the snapshot.
  version = jsondecode(file("${var.service_dir}/package.json")).version
  # digitalocean/marketplace-partners at a reviewed commit (5 November 2026), with the sha256 of
  # each script it runs.
  marketplace    = "https://raw.githubusercontent.com/digitalocean/marketplace-partners/fb9f872e7ade13b530da5ef2b7a3e7938c0f3774/scripts"
  cleanup_sha256 = "5e2fe7ce30892a26ed2731238d9f26c40ae8b1084b070ce095f3b99ab1a2cc81"
  check_sha256   = "91ff2b1880439c97ccdc49554c5ed8901b89ef250c8ac5fffe52811c68abac49"
}

source "digitalocean" "droplet" {
  api_token     = var.api_token
  image         = "ubuntu-24-04-x64"
  region        = var.region
  size          = "s-1vcpu-1gb"
  ssh_username  = "root"
  snapshot_name = "qrcode-barcode-scanner-${local.version}-{{timestamp}}"
}

build {
  sources = ["source.digitalocean.droplet"]

  provisioner "shell" {
    inline = ["cloud-init status --wait", "install -d -m 700 /root/qrscan-build"]
  }

  provisioner "file" {
    source      = "${var.service_dir}/"
    destination = "/root/qrscan-build/http"
  }

  provisioner "file" {
    source      = "${path.root}/"
    destination = "/root/qrscan-build/droplet"
  }

  provisioner "shell" {
    environment_vars = ["DEBIAN_FRONTEND=noninteractive"]
    inline = [
      "bash /root/qrscan-build/droplet/install.sh /root/qrscan-build/http",
      "rm -r /root/qrscan-build",
      # 90-cleanup.sh empties /tmp, so DigitalOcean's scripts wait in /root until they have run.
      "install -d -m 700 /root/marketplace",
      "curl --fail --silent --show-error --location --proto '=https' -o /root/marketplace/90-cleanup.sh ${local.marketplace}/90-cleanup.sh",
      "curl --fail --silent --show-error --location --proto '=https' -o /root/marketplace/99-img-check.sh ${local.marketplace}/99-img-check.sh",
      "echo '${local.cleanup_sha256}  /root/marketplace/90-cleanup.sh' | sha256sum --check --strict -",
      "echo '${local.check_sha256}  /root/marketplace/99-img-check.sh' | sha256sum --check --strict -",
      "bash /root/marketplace/90-cleanup.sh",
      "bash /root/marketplace/99-img-check.sh",
      "rm -r /root/marketplace",
    ]
  }
}
