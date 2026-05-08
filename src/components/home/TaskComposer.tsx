import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WELLNESS_CATEGORIES, type SuggestedTask, type WellnessCategory } from '@/src/types/ai-task';

type TaskComposerProps = {
  onCreateTask: (title: string, detail: string) => void;
  selectedCategory: WellnessCategory;
  onSelectCategory: (category: WellnessCategory) => void;
  onGenerateSuggestion: (category: WellnessCategory) => void;
  isGeneratingSuggestion: boolean;
  suggestedTasks: SuggestedTask[];
  onReviewSuggestions: () => void;
};

export function TaskComposer({
  onCreateTask,
  selectedCategory,
  onSelectCategory,
  onGenerateSuggestion,
  isGeneratingSuggestion,
  suggestedTasks,
  onReviewSuggestions,
}: TaskComposerProps) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');

  const handleCreate = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    onCreateTask(cleanTitle, detail.trim());
    setTitle('');
    setDetail('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add a gentle task</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
        placeholderTextColor="#8EA2C9"
        style={styles.input}
        returnKeyType="done"
      />
      <TextInput
        value={detail}
        onChangeText={setDetail}
        placeholder="Optional detail"
        placeholderTextColor="#8EA2C9"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create task"
        onPress={handleCreate}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Create Task</Text>
      </Pressable>

      <View style={styles.aiSection}>
        <Text style={styles.aiHeading}>AI task suggestion</Text>
        <Text style={styles.aiCaption}>Pick a wellness focus and generate a gentle task.</Text>
        <View style={styles.chipsWrap}>
          {WELLNESS_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`Select ${category} category`}
              onPress={() => onSelectCategory(category)}
              style={({ pressed }) => [
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
                pressed && styles.categoryChipPressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate AI suggestion"
          onPress={() => onGenerateSuggestion(selectedCategory)}
          disabled={isGeneratingSuggestion}
          style={({ pressed }) => [
            styles.generateButton,
            (pressed || isGeneratingSuggestion) && styles.generateButtonPressed,
          ]}
        >
          <Text style={styles.generateButtonText}>
            {isGeneratingSuggestion ? 'Generating...' : 'Generate AI Task'}
          </Text>
        </Pressable>

        <View style={styles.suggestionFooter}>
          <Text style={styles.suggestionCount}>Suggestions: {suggestedTasks.length}/5</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review suggested tasks"
            onPress={onReviewSuggestions}
            disabled={suggestedTasks.length === 0}
            style={({ pressed }) => [
              styles.reviewButton,
              suggestedTasks.length === 0 && styles.reviewButtonDisabled,
              pressed && suggestedTasks.length > 0 && styles.reviewButtonPressed,
            ]}
          >
            <Text style={styles.reviewButtonText}>Review & Confirm</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  heading: {
    color: '#E7F0FF',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(12,20,54,0.55)',
    color: '#E8F1FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#34D3C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#0D223A',
    fontSize: 14,
    fontWeight: '800',
  },
  aiSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    gap: 8,
  },
  aiHeading: {
    color: '#E7F0FF',
    fontSize: 14,
    fontWeight: '700',
  },
  aiCaption: {
    color: '#9EB2D8',
    fontSize: 12,
    lineHeight: 18,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  categoryChip: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(52,211,195,0.2)',
    borderColor: 'rgba(52,211,195,0.55)',
  },
  categoryChipPressed: {
    opacity: 0.88,
  },
  categoryChipText: {
    color: '#C3D2ED',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#D9FFF9',
  },
  generateButton: {
    minHeight: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.5)',
  },
  generateButtonPressed: {
    opacity: 0.86,
  },
  generateButtonText: {
    color: '#EAF1FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  suggestionFooter: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  suggestionCount: {
    color: '#AFC2E6',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewButton: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  reviewButtonDisabled: {
    opacity: 0.45,
  },
  reviewButtonPressed: {
    opacity: 0.88,
  },
  reviewButtonText: {
    color: '#E6EEFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
