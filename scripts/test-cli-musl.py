#!/usr/bin/env python3
"""Exercise static musl CLI admission and Alpine receipts without building Rust."""
import importlib.util
from pathlib import Path
import types
import unittest
from unittest.mock import patch


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


release = load("cli_release", "cli-release.py")
floor = load("native_floor", "native-floor.py")
consumer = load("packed_cli_consumer", "packed-cli-consumer.py")


class MuslAdmission(unittest.TestCase):
    def test_two_native_build_and_consumer_targets(self):
        for target, runner, host, arch in (
            ("x86_64-unknown-linux-musl", "ubuntu-24.04", "x86_64-unknown-linux-gnu", "x86_64"),
            ("aarch64-unknown-linux-musl", "ubuntu-24.04-arm", "aarch64-unknown-linux-gnu", "aarch64"),
        ):
            with self.subTest(target=target):
                self.assertIn(target, release.TARGETS)
                row = release.TARGETS[target]
                self.assertEqual((row["build_runner"], row["consumer_runner"], row["build_host"]),
                                 (runner, runner, host))
                self.assertEqual(row["linker"], "musl-cc")
                self.assertEqual(row["rustflags"], ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"])
                self.assertEqual(consumer.TARGETS[target], ("linux", arch, "tar.gz"))
                self.assertEqual(row["containers"], [{"image": "alpine:3.22", "musl": "1.2.5",
                                  "platform": "linux/amd64" if arch == "x86_64" else "linux/arm64",
                                  "runner": runner}])

    def test_target_static_executable_kinds_are_admitted(self):
        for target, machine in (("x86_64-unknown-linux-musl", 62), ("aarch64-unknown-linux-musl", 183)):
            with self.subTest(target=target):
                self.assertIn(target, floor.CLI_FLOOR)
                data = floor.make_elf(machine=machine, e_type=3 if machine == 62 else 2, needed=(), versions=(), stack=6)
                self.assertEqual(floor.cli_problems("qrscan", target, floor.elf(data), data, None, ()), [])

    def test_static_files_refuse_the_wrong_executable_kind(self):
        for target, machine, bad, expected in (
            ("x86_64-unknown-linux-musl", 62, 2, 3),
            ("aarch64-unknown-linux-musl", 183, 3, 2),
        ):
            with self.subTest(target=target):
                data = floor.make_elf(machine=machine, e_type=bad, needed=(), versions=(), stack=6)
                self.assertEqual(floor.cli_problems("qrscan", target, floor.elf(data), data, None, ()),
                    [f"qrscan: ELF type {bad}, expected {expected} for static musl"])

    def test_static_files_refuse_dynamic_dependencies_and_loader(self):
        target = "x86_64-unknown-linux-musl"
        self.assertIn(target, floor.CLI_FLOOR)
        for change, expected in (
            ({"interp": "/lib/ld-musl-x86_64.so.1"},
             "qrscan: PT_INTERP /lib/ld-musl-x86_64.so.1 on a static musl executable"),
            ({"needed": ("libc.so.6",)}, "qrscan: DT_NEEDED libc.so.6 on a static musl executable"),
            ({"versions": ("GLIBC_2.28",)}, "qrscan: symbol version GLIBC_2.28 on a static musl executable"),
            ({"versions": ("foreign_1.0",)}, "qrscan: symbol version foreign_1.0 on a static musl executable"),
            ({"stack": 7}, "qrscan: an executable stack (PT_GNU_STACK RWX)"),
        ):
            with self.subTest(change=change):
                data = floor.make_elf(**{**{"needed": (), "versions": (), "stack": 6}, **change})
                self.assertEqual(floor.cli_problems("qrscan", target, floor.elf(data), data, None, ()), [expected])

    def test_musl_probe_reads_the_loader_banner(self):
        self.assertTrue(hasattr(consumer, "container_musl"))
        reply = types.SimpleNamespace(returncode=1, stdout=b"", stderr=b"musl libc (aarch64)\nVersion 1.2.5\nDynamic Program Loader\n")
        with patch.object(consumer, "docker_command", return_value=["docker"]), \
             patch.object(consumer.subprocess, "run", return_value=reply):
            self.assertEqual(consumer.container_musl({"image": "alpine"}), ("1.2.5", "musl dynamic loader"))

    def test_musl_probe_refuses_a_glibc_banner(self):
        self.assertTrue(hasattr(consumer, "container_musl"))
        reply = types.SimpleNamespace(returncode=0, stdout=b"glibc 2.36\n", stderr=b"")
        with patch.object(consumer, "docker_command", return_value=["docker"]), \
             patch.object(consumer.subprocess, "run", return_value=reply):
            with self.assertRaises(consumer.Refused):
                consumer.container_musl({"image": "foreign"})


if __name__ == "__main__":
    unittest.main()
