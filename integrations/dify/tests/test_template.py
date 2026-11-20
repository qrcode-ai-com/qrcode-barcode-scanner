"""The template draft is consistent with the plugin it uses. Not a Dify import: that remains to do."""
import yaml

from conftest import PLUGIN_ROOT

TEMPLATE = PLUGIN_ROOT / "template" / "qr-and-barcode-reader.yml"


def load():
    return yaml.safe_load(TEMPLATE.read_text())


def test_the_draft_is_a_workflow_app_with_no_model():
    app = load()
    assert app["kind"] == "app" and app["app"]["mode"] == "workflow"
    types = sorted(node["data"]["type"] for node in app["workflow"]["graph"]["nodes"])
    assert types == ["end", "end", "end", "if-else", "start", "tool"]
    assert "dependencies" not in app, "the dependency is written by Dify's export, from the Marketplace install"


def test_the_tool_node_names_this_plugin_and_its_declared_parameters():
    manifest = yaml.safe_load((PLUGIN_ROOT / "manifest.yaml").read_text())
    provider = yaml.safe_load((PLUGIN_ROOT / "provider/qrcode_barcode_scanner.yaml").read_text())
    tool = yaml.safe_load((PLUGIN_ROOT / "tools/scan_image.yaml").read_text())
    [node] = [node["data"] for node in load()["workflow"]["graph"]["nodes"] if node["data"]["type"] == "tool"]
    assert node["provider_id"] == f"{manifest['author']}/{manifest['name']}/{provider['identity']['name']}"
    assert node["tool_name"] == tool["identity"]["name"]
    declared = {parameter["name"]: parameter for parameter in tool["parameters"]}
    assert set(node["tool_parameters"]) == {name for name, p in declared.items() if p["form"] == "llm"}
    assert set(node["tool_configurations"]) == {name for name, p in declared.items() if p["form"] == "form"}
    profiles = [option["value"] for option in declared["profile"]["options"]]
    assert node["tool_configurations"]["profile"]["value"] in profiles
    assert node["error_strategy"] == "fail-branch"


def test_every_edge_and_selector_points_at_a_node_and_an_output_that_exist():
    graph = load()["workflow"]["graph"]
    nodes = {node["id"]: node["data"] for node in graph["nodes"]}
    for edge in graph["edges"]:
        assert edge["source"] in nodes and edge["target"] in nodes, edge["id"]
        assert edge["data"]["sourceType"] == nodes[edge["source"]]["type"]
        assert edge["data"]["targetType"] == nodes[edge["target"]]["type"]
    handles = {(edge["source"], edge["sourceHandle"]) for edge in graph["edges"]}
    assert {("scan", "source"), ("scan", "fail-branch"), ("found", "true"), ("found", "false")} <= handles
    tool = yaml.safe_load((PLUGIN_ROOT / "tools/scan_image.yaml").read_text())
    scan_outputs = {"text", "json", "files", "error_message", "error_type"} | set(tool["output_schema"]["properties"])
    for data in nodes.values():
        selectors = [row["value_selector"] for row in data.get("outputs", [])]
        selectors += [c["variable_selector"] for case in data.get("cases", []) for c in case["conditions"]]
        selectors += [p["value"] for p in data.get("tool_parameters", {}).values() if p["type"] == "variable"]
        for node_id, name in selectors:
            assert node_id in nodes, (data["title"], node_id)
            if node_id == "scan":
                assert name in scan_outputs, (data["title"], name)
            if node_id == "start":
                assert name in {v["variable"] for v in nodes["start"]["variables"]}
