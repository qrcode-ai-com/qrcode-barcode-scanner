// SPDX-License-Identifier: AGPL-3.0-or-later

// Package qrscan reads QR codes and barcodes from images with the QR Code & Barcode Scanner
// engine, compiled to WebAssembly (WASI) and run by wazero. It needs no C toolchain and no cgo.
//
// This is a spike. The WebAssembly module is given by the caller: it is not embedded yet.
package qrscan

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

// Profile says how much work one scan does.
type Profile uint32

const (
	// Full decodes and judges how well a QR code scans.
	Full Profile = iota
	// Fast decodes first, with a reduced judgment.
	Fast
	// Frame decodes only: the report carries no score.
	Frame
)

// ProfileBudget keeps the profile's own time budget. Unbounded sets none.
const (
	ProfileBudget int64 = -1
	Unbounded     int64 = 0
)

// Error is a refusal of the engine, with its own code, such as QRS-001 for bytes that are not
// an image.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string { return fmt.Sprintf("%s [%s]", e.Message, e.Code) }

// Scanner holds one instance of the engine. It is safe for concurrent use: scans run one at
// a time.
type Scanner struct {
	mu       sync.Mutex
	runtime  wazero.Runtime
	compiled wazero.CompiledModule
	module   api.Module
}

// New compiles the WebAssembly module of the engine and starts one instance.
// interpret runs it in wazero's interpreter in place of its compiler.
func New(ctx context.Context, wasm []byte, interpret bool) (*Scanner, error) {
	config := wazero.NewRuntimeConfig()
	if interpret {
		config = wazero.NewRuntimeConfigInterpreter()
	}
	// A cancelled context stops a running scan.
	runtime := wazero.NewRuntimeWithConfig(ctx, config.WithCloseOnContextDone(true))
	if _, err := wasi_snapshot_preview1.Instantiate(ctx, runtime); err != nil {
		runtime.Close(ctx)
		return nil, fmt.Errorf("qrscan: WASI: %w", err)
	}
	compiled, err := runtime.CompileModule(ctx, wasm)
	if err != nil {
		runtime.Close(ctx)
		return nil, fmt.Errorf("qrscan: compile: %w", err)
	}
	scanner := &Scanner{runtime: runtime, compiled: compiled}
	if err := scanner.start(ctx); err != nil {
		runtime.Close(ctx)
		return nil, err
	}
	return scanner, nil
}

// start makes a new instance. The engine reads the clock for its time budget and random bytes
// for its hash maps; it gets no file, no argument and no environment.
func (s *Scanner) start(ctx context.Context) error {
	module, err := s.runtime.InstantiateModule(ctx, s.compiled, wazero.NewModuleConfig().
		WithName("").
		WithStartFunctions("_initialize").
		WithSysNanotime().
		WithSysWalltime().
		WithRandSource(rand.Reader))
	if err != nil {
		return fmt.Errorf("qrscan: start: %w", err)
	}
	for _, name := range []string{"qrs_alloc", "qrs_free", "qrs_scan", "qrs_capabilities"} {
		if module.ExportedFunction(name) == nil {
			module.Close(ctx)
			return fmt.Errorf("qrscan: the module does not export %s", name)
		}
	}
	s.module = module
	return nil
}

// Close frees the engine.
func (s *Scanner) Close(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.runtime.Close(ctx)
}

// Scan reads the codes of an encoded image (PNG, JPEG, WebP or GIF) and returns the engine's
// report as JSON, unchanged. budgetMs is ProfileBudget, Unbounded or a number of milliseconds.
// An image with no code is a report with no detection, not an error.
func (s *Scanner) Scan(ctx context.Context, image []byte, profile Profile, budgetMs int64) ([]byte, error) {
	if len(image) == 0 {
		return nil, errors.New("qrscan: the image is empty")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.module == nil || s.module.IsClosed() {
		// A cancelled or trapped scan closed the instance: start a new one.
		if err := s.start(ctx); err != nil {
			return nil, err
		}
	}
	allocated, err := s.module.ExportedFunction("qrs_alloc").Call(ctx, uint64(len(image)))
	if err != nil {
		return nil, fmt.Errorf("qrscan: alloc: %w", err)
	}
	input := uint32(allocated[0])
	if !s.module.Memory().Write(input, image) {
		return nil, errors.New("qrscan: the image does not fit the module's memory")
	}
	answer, err := s.module.ExportedFunction("qrs_scan").Call(ctx, uint64(input), uint64(len(image)), uint64(profile), api.EncodeI64(budgetMs))
	if err != nil {
		return nil, fmt.Errorf("qrscan: scan: %w", err)
	}
	if _, err := s.module.ExportedFunction("qrs_free").Call(ctx, uint64(input), uint64(len(image))); err != nil {
		return nil, fmt.Errorf("qrscan: free: %w", err)
	}
	report, err := s.take(ctx, answer[0])
	if err != nil {
		return nil, err
	}
	var refused struct {
		Error *Error `json:"error"`
	}
	if err := json.Unmarshal(report, &refused); err != nil {
		return nil, fmt.Errorf("qrscan: the engine's answer is not JSON: %w", err)
	}
	if refused.Error != nil {
		return nil, refused.Error
	}
	return report, nil
}

// Capabilities returns what the engine can read, as JSON: versions, engines and symbologies.
func (s *Scanner) Capabilities(ctx context.Context) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.module == nil || s.module.IsClosed() {
		if err := s.start(ctx); err != nil {
			return nil, err
		}
	}
	answer, err := s.module.ExportedFunction("qrs_capabilities").Call(ctx)
	if err != nil {
		return nil, fmt.Errorf("qrscan: capabilities: %w", err)
	}
	return s.take(ctx, answer[0])
}

// take copies an answer out of the module's memory and gives its buffer back.
func (s *Scanner) take(ctx context.Context, answer uint64) ([]byte, error) {
	address, length := uint32(answer>>32), uint32(answer)
	view, ok := s.module.Memory().Read(address, length)
	if !ok {
		return nil, errors.New("qrscan: the engine's answer is outside its memory")
	}
	copied := append([]byte(nil), view...)
	if _, err := s.module.ExportedFunction("qrs_free").Call(ctx, uint64(address), uint64(length)); err != nil {
		return nil, fmt.Errorf("qrscan: free: %w", err)
	}
	return copied, nil
}
