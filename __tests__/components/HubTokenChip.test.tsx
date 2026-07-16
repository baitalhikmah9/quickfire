import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { HubTokenChip } from '@/components/HubTokenChip';

describe('HubTokenChip', () => {
  it('softUi uses settings/store squircle geometry (not a wide pill)', () => {
    render(
      <HubTokenChip
        label="Tokens"
        value="12"
        rowDirection="row"
        variant="softUi"
        onPress={() => {}}
      />,
    );

    const face = screen.getByTestId('hub-token-chip-face');
    const flat = StyleSheet.flatten(face.props.style);

    expect(flat.height).toBe(44);
    expect(flat.borderRadius).toBe(14);
    // Capsule pills use ~999 or half-height radii; keep squircle corners.
    expect(flat.borderRadius).toBeLessThan(22);
  });

  it('never clips large token counts (content-sized, non-shrinking)', () => {
    render(
      <HubTokenChip
        label="Tokens"
        value="1,234,567"
        rowDirection="row"
        variant="softUi"
        onPress={() => {}}
      />,
    );

    const outer = screen.getByTestId('hub-token-chip');
    const outerFlat = StyleSheet.flatten(outer.props.style);
    expect(outerFlat.flexShrink).toBe(0);
    expect(outerFlat.maxWidth).toBeUndefined();

    const value = screen.getByTestId('hub-token-chip-value');
    expect(value.props.children).toBe('1,234,567');
    expect(value.props.ellipsizeMode).toBeUndefined();
    const valueFlat = StyleSheet.flatten(value.props.style);
    expect(valueFlat.flexShrink).toBe(0);
  });
});
