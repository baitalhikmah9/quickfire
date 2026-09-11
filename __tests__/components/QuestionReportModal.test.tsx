import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  getReportModalViewportScale,
  QuestionReportModal,
} from '@/features/play/components/QuestionReportModal';
import type { QuestionCard } from '@/features/shared';

function question(): QuestionCard {
  return {
    id: 'q-report',
    canonicalKey: 'science:200:report',
    categoryId: 'cat_science',
    categoryName: 'Science',
    prompt: 'What is 2 + 2?',
    answer: '4',
    pointValue: 200,
    locale: 'en',
    resolvedFromFallback: false,
    used: false,
  };
}

describe('QuestionReportModal', () => {
  it('scales down on short landscape viewports', () => {
    expect(getReportModalViewportScale(1200, 675)).toBeCloseTo(1, 5);
    expect(getReportModalViewportScale(844, 390)).toBe(0.88);
  });

  it('renders nothing when closed', () => {
    render(
      <QuestionReportModal
        visible={false}
        question={question()}
        sessionId="session-1"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(screen.queryByTestId('question-report-modal')).toBeNull();
  });

  it('lets the player pick multiple issues, Other text, and a single location pill', () => {
    const onSubmit = jest.fn();
    render(
      <QuestionReportModal
        visible
        question={question()}
        sessionId="session-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByTestId('question-report-modal')).toBeTruthy();
    const overlayStyle = StyleSheet.flatten(
      screen.getByTestId('question-report-modal').props.style
    );
    expect(overlayStyle.flex).toBe(1);
    expect(overlayStyle.width).toBe('100%');
    expect(overlayStyle.height).toBe('100%');
    expect(overlayStyle.backgroundColor).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ScrollView)).toBeTruthy();
    expect(screen.getByText('Factually incorrect')).toBeTruthy();
    expect(screen.getByText('Ambiguous / multiple correct answers')).toBeTruthy();
    expect(screen.getByText('Inappropriate / unsuitable content')).toBeTruthy();
    expect(screen.getByText('Bad / unfun question')).toBeTruthy();
    expect(screen.getByText('Question')).toBeTruthy();
    expect(screen.getByText('Answer')).toBeTruthy();
    expect(screen.getByText('Both')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Question').props.style).flexShrink).toBe(0);
    expect(
      screen.getByText('Ambiguous / multiple correct answers').props.numberOfLines
    ).toBe(2);
    expect(screen.queryByTestId('question-report-other-input')).toBeNull();

    const factualReason = screen.getByText('Factually incorrect');
    const unselectedColor = StyleSheet.flatten(factualReason.props.style).color;
    fireEvent.press(factualReason);
    expect(StyleSheet.flatten(screen.getByText('Factually incorrect').props.style).color).not.toBe(
      unselectedColor
    );
    fireEvent.press(screen.getByText('Other'));
    expect(screen.getByTestId('question-report-other-input')).toBeTruthy();
    fireEvent.changeText(
      screen.getByTestId('question-report-other-input'),
      'Nonsensical clue'
    );

    fireEvent.press(screen.getByLabelText('Answer'));
    expect(screen.getByTestId('question-report-location-pill')).toHaveProp(
      'accessibilityValue',
      { text: 'answer' }
    );

    fireEvent.press(screen.getByLabelText('Both'));
    expect(screen.getByTestId('question-report-location-pill')).toHaveProp(
      'accessibilityValue',
      { text: 'both' }
    );

    fireEvent.press(screen.getByText('Submit'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: 'q-report',
        canonicalKey: 'science:200:report',
        prompt: 'What is 2 + 2?',
        answer: '4',
        reasons: ['factually_incorrect', 'other'],
        problemLocation: 'both',
        otherText: 'Nonsensical clue',
        sessionId: 'session-1',
      })
    );
  });

  it('keeps Submit disabled until a reason and location are chosen', () => {
    render(
      <QuestionReportModal
        visible
        question={question()}
        sessionId="session-1"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Submit report')).toBeDisabled();
    fireEvent.press(screen.getByText('Unclear or badly written'));
    expect(screen.getByLabelText('Submit report')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Question'));
    expect(screen.getByLabelText('Submit report')).toBeEnabled();
  });
});
