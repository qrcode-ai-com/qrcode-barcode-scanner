// SPDX-License-Identifier: AGPL-3.0-or-later

package qrscan

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"
	"sort"
	"testing"
	"time"
)

// The tests need the built module (QRSCAN_WASM) and the fixtures directory of the engine
// repository (QRSCAN_FIXTURES). QRSCAN_NATIVE, the released qrscan command, adds the comparison
// with the native engine, and QRSCAN_MEASURE_OUT a file for the measurements.

type report struct {
	Detections []struct {
		Symbology string `json:"symbology"`
		Content   struct {
			Text string `json:"text"`
			Raw  string `json:"raw"`
		} `json:"content"`
	} `json:"detections"`
	Score *struct {
		Value int `json:"value"`
	} `json:"score"`
	Trace struct {
		BudgetExhausted bool `json:"budget_exhausted"`
	} `json:"trace"`
	Versions struct {
		Scanner string `json:"scanner"`
	} `json:"versions"`
}

func need(t testing.TB, name string) string {
	t.Helper()
	value := os.Getenv(name)
	if value == "" {
		t.Fatalf("set %s", name)
	}
	return value
}

func module(t testing.TB) []byte {
	t.Helper()
	wasm, err := os.ReadFile(need(t, "QRSCAN_WASM"))
	if err != nil {
		t.Fatal(err)
	}
	return wasm
}

func fixture(t testing.TB, relative string) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(need(t, "QRSCAN_FIXTURES"), relative))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func scanner(t testing.TB, interpret bool) *Scanner {
	t.Helper()
	s, err := New(context.Background(), module(t), interpret)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close(context.Background()) })
	return s
}

func decode(t testing.TB, data []byte) report {
	t.Helper()
	var r report
	if err := json.Unmarshal(data, &r); err != nil {
		t.Fatalf("not a report: %v", err)
	}
	return r
}

// contents lists each detection as symbology, text and exact bytes, sorted.
func contents(r report) [][3]string {
	rows := [][3]string{}
	for _, d := range r.Detections {
		raw, _ := base64.StdEncoding.DecodeString(d.Content.Raw)
		rows = append(rows, [3]string{d.Symbology, d.Content.Text, string(raw)})
	}
	sort.Slice(rows, func(a, b int) bool { return rows[a][0] < rows[b][0] })
	return rows
}

var mixed = [][3]string{
	{"code128", "STOCK-4827", "STOCK-4827"},
	{"qr_code", "https://qrc-ai.com/76xMa", "https://qrc-ai.com/76xMa"},
}

var profiles = []struct {
	name    string
	profile Profile
}{{"fast", Fast}, {"frame", Frame}, {"full", Full}}

func TestMixedImageReturnsBothCodesExactly(t *testing.T) {
	image := fixture(t, "symbology/mixed-code128-qr.png")
	for _, mode := range []struct {
		name      string
		interpret bool
	}{{"compiler", false}, {"interpreter", true}} {
		s := scanner(t, mode.interpret)
		for _, p := range profiles {
			data, err := s.Scan(context.Background(), image, p.profile, Unbounded)
			if err != nil {
				t.Fatalf("%s %s: %v", mode.name, p.name, err)
			}
			r := decode(t, data)
			if got := contents(r); !reflect.DeepEqual(got, mixed) {
				t.Errorf("%s %s: detections %v, want %v", mode.name, p.name, got, mixed)
			}
			if r.Trace.BudgetExhausted || r.Versions.Scanner != "0.11.0" {
				t.Errorf("%s %s: cut %v, engine %q", mode.name, p.name, r.Trace.BudgetExhausted, r.Versions.Scanner)
			}
			if p.profile == Frame && r.Score != nil {
				t.Errorf("%s frame: the frame profile never judges", mode.name)
			}
			if p.profile == Full && r.Score == nil {
				t.Errorf("%s full: no score", mode.name)
			}
		}
	}
}

func TestFullProfileJudgesACleanCode(t *testing.T) {
	data, err := scanner(t, false).Scan(context.Background(), fixture(t, "clean/gen_v5_q.png"), Full, Unbounded)
	if err != nil {
		t.Fatal(err)
	}
	r := decode(t, data)
	if len(r.Detections) != 1 || r.Detections[0].Content.Text != "https://qrcode-ai.com/c/v5q" || r.Score == nil || r.Score.Value != 100 {
		t.Fatalf("got %s", data[:200])
	}
}

func TestAnImageWithNoCodeIsAResult(t *testing.T) {
	white := image.NewGray(image.Rect(0, 0, 64, 64))
	for i := range white.Pix {
		white.Pix[i] = 0xff
	}
	var encoded bytes.Buffer
	if err := png.Encode(&encoded, white); err != nil {
		t.Fatal(err)
	}
	data, err := scanner(t, false).Scan(context.Background(), encoded.Bytes(), Full, Unbounded)
	if err != nil {
		t.Fatal(err)
	}
	if r := decode(t, data); len(r.Detections) != 0 || r.Score != nil || r.Trace.BudgetExhausted {
		t.Fatalf("got %s", data)
	}
	_ = color.Gray{}
}

func TestBytesThatAreNotAnImageAreRefusedWithTheEnginesCode(t *testing.T) {
	_, err := scanner(t, false).Scan(context.Background(), []byte("not an image"), Fast, Unbounded)
	var refused *Error
	if !errors.As(err, &refused) || refused.Code != "QRS-001" {
		t.Fatalf("got %v", err)
	}
}

func TestCapabilitiesNameTheEngine(t *testing.T) {
	data, err := scanner(t, false).Capabilities(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	var c struct {
		Versions    struct{ Scanner string } `json:"versions"`
		Engines     []string                 `json:"engines"`
		Symbologies []string                 `json:"symbologies"`
	}
	if err := json.Unmarshal(data, &c); err != nil {
		t.Fatal(err)
	}
	sort.Strings(c.Symbologies)
	if c.Versions.Scanner != "0.11.0" || sort.SearchStrings(c.Symbologies, "code128") == len(c.Symbologies) || len(c.Engines) != 3 {
		t.Fatalf("got %s", data)
	}
}

func TestACancelledContextStopsAScanAndTheNextOneWorks(t *testing.T) {
	s := scanner(t, true) // the interpreter is slow enough to be caught mid-scan
	image := fixture(t, "symbology/mixed-code128-qr.png")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	started := time.Now()
	if _, err := s.Scan(ctx, image, Full, Unbounded); err == nil {
		t.Fatalf("a full scan in the interpreter ended within 20 ms: not a test of cancellation")
	}
	if waited := time.Since(started); waited > 5*time.Second {
		t.Errorf("the scan stopped after %v", waited)
	}
	data, err := s.Scan(context.Background(), image, Frame, Unbounded)
	if err != nil {
		t.Fatalf("the scan after a cancelled one: %v", err)
	}
	if got := contents(decode(t, data)); !reflect.DeepEqual(got, mixed) {
		t.Errorf("after a cancelled scan: %v", got)
	}
}

// untimed removes what legitimately differs between two runs: the measured times.
func untimed(t testing.TB, data []byte) map[string]any {
	t.Helper()
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	trace := value["trace"].(map[string]any)
	trace["total_ms"] = 0
	for _, stage := range trace["stages"].([]any) {
		stage.(map[string]any)["ms"] = 0
	}
	return value
}

func native(t testing.TB, profile, file string) []byte {
	t.Helper()
	command := exec.Command(need(t, "QRSCAN_NATIVE"), "--profile", profile, "--budget-ms", "0", "--", file)
	out, err := command.Output()
	var exit *exec.ExitError
	if err != nil && !(errors.As(err, &exit) && exit.ExitCode() == 1) {
		t.Fatalf("native qrscan: %v", err)
	}
	return out
}

func TestTheReportEqualsTheNativeEngines(t *testing.T) {
	if os.Getenv("QRSCAN_NATIVE") == "" {
		t.Skip("QRSCAN_NATIVE is not set")
	}
	s := scanner(t, false)
	for _, name := range []string{"symbology/mixed-code128-qr.png", "clean/gen_v5_q.png"} {
		file := filepath.Join(need(t, "QRSCAN_FIXTURES"), name)
		for _, p := range profiles {
			data, err := s.Scan(context.Background(), fixture(t, name), p.profile, Unbounded)
			if err != nil {
				t.Fatal(err)
			}
			if got, want := untimed(t, data), untimed(t, native(t, p.name, file)); !reflect.DeepEqual(got, want) {
				gotJSON, _ := json.Marshal(got)
				wantJSON, _ := json.Marshal(want)
				t.Errorf("%s %s: the WebAssembly report differs from the native one\nwasm   %.600s\nnative %.600s", name, p.name, gotJSON, wantJSON)
			}
		}
	}
}

func median(values []float64) float64 {
	sorted := append([]float64(nil), values...)
	sort.Float64s(sorted)
	return sorted[len(sorted)/2]
}

// TestMeasure records what the owner decides on: the size of the module, how long it takes to
// load, and each profile's time against the native command, on this machine.
func TestMeasure(t *testing.T) {
	out := os.Getenv("QRSCAN_MEASURE_OUT")
	if out == "" {
		t.Skip("QRSCAN_MEASURE_OUT is not set")
	}
	wasm := module(t)
	digest := sha256.Sum256(wasm)
	image := fixture(t, "symbology/mixed-code128-qr.png")
	file := filepath.Join(need(t, "QRSCAN_FIXTURES"), "symbology/mixed-code128-qr.png")
	const runs = 7
	result := map[string]any{
		"host":           runtime.GOOS + "/" + runtime.GOARCH,
		"go":             runtime.Version(),
		"cpus":           runtime.NumCPU(),
		"moduleBytes":    len(wasm),
		"moduleSha256":   hex.EncodeToString(digest[:]),
		"fixture":        "fixtures/symbology/mixed-code128-qr.png",
		"runsPerMeasure": runs,
		"budget":         "none",
	}
	for _, mode := range []struct {
		name      string
		interpret bool
	}{{"compiler", false}, {"interpreter", true}} {
		started := time.Now()
		s, err := New(context.Background(), wasm, mode.interpret)
		if err != nil {
			t.Fatal(err)
		}
		entry := map[string]any{"loadMs": float64(time.Since(started).Microseconds()) / 1000}
		for _, p := range profiles {
			times := []float64{}
			for i := 0; i < runs; i++ {
				started := time.Now()
				if _, err := s.Scan(context.Background(), image, p.profile, Unbounded); err != nil {
					t.Fatal(err)
				}
				times = append(times, float64(time.Since(started).Microseconds())/1000)
			}
			entry[p.name+"MedianMs"] = median(times)
		}
		s.Close(context.Background())
		result["wazero-"+mode.name] = entry
	}
	if os.Getenv("QRSCAN_NATIVE") != "" {
		entry := map[string]any{"note": "one process per scan, start included"}
		for _, p := range profiles {
			times := []float64{}
			for i := 0; i < runs; i++ {
				started := time.Now()
				native(t, p.name, file)
				times = append(times, float64(time.Since(started).Microseconds())/1000)
			}
			entry[p.name+"MedianMs"] = median(times)
		}
		result["native-cli"] = entry
	}
	encoded, _ := json.MarshalIndent(result, "", "  ")
	if err := os.WriteFile(out, append(encoded, '\n'), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("%s", encoded)
}
