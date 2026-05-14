import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WELLNESS_CATEGORIES, type SuggestedTask, type WellnessCategory } from '@/src/types/ai-task';
import { useAppTheme } from '@/src/theme/app-theme';

type TaskComposerProps = {
  onCreateTask: (title: string, detail: string) => void;
  selectedCategory: WellnessCategory;
  onSelectCategory: (category: WellnessCategory) => void;
  onGenerateSuggestion: (category: WellnessCategory) => void;
  isGeneratingSuggestion: boolean;
  suggestedTasks: SuggestedTask[];
};

export function TaskComposer({
  onCreateTask,
  selectedCategory,
  onSelectCategory,
  onGenerateSuggestion,
  isGeneratingSuggestion,
  suggestedTasks,
}: TaskComposerProps) {
  const theme = useAppTheme();
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
    <View style={[styles.container, { backgroundColor: theme.softSurface, borderColor: theme.border }]}>
      <View style={styles.introRow}>
        <View style={[styles.introIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="leaf-outline" size={18} color={theme.primaryStrong} />
        </View>
        <View style={styles.introText}>
          <Text style={[styles.heading, { color: theme.text }]}>Create one small step</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>Keep it easy enough for today.</Text>
        </View>
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What would help right now?"
        placeholderTextColor={theme.subtle}
        style={[
          styles.input,
          { backgroundColor: theme.surface, borderColor: theme.softBorder, color: theme.text },
        ]}
        returnKeyType="done"
      />
      <TextInput
        value={detail}
        onChangeText={setDetail}
        placeholder="Optional note"
        placeholderTextColor={theme.subtle}
        style={[
          styles.input,
          styles.detailInput,
          { backgroundColor: theme.surface, borderColor: theme.softBorder, color: theme.text },
        ]}
        multiline
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create task"
        onPress={handleCreate}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.buttonPressed]}
      >
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>Add Gentle Task</Text>
      </Pressable>

      <View style={[styles.aiSection, { borderTopColor: theme.border }]}>
        <View style={styles.aiHeaderRow}>
          <View>
            <Text style={[styles.aiHeading, { color: theme.textStrong }]}>Need an idea?</Text>
            <Text style={[styles.aiCaption, { color: theme.muted }]}>Choose a focus and Wenwen can suggest tasks.</Text>
          </View>
        </View>
        <View style={styles.chipsWrap}>
          {WELLNESS_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`Select ${category} category`}
              onPress={() => onSelectCategory(category)}
              style={({ pressed }) => [
                styles.categoryChip,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.softBorder,
                },
                selectedCategory === category && {
                  backgroundColor: theme.primarySoft,
                  borderColor: theme.primary,
                },
                pressed && styles.categoryChipPressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: theme.muted },
                  selectedCategory === category && { color: theme.primaryStrong },
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
            { backgroundColor: theme.primary, borderColor: theme.primary },
            (pressed || isGeneratingSuggestion) && styles.generateButtonPressed,
          ]}
        >
          <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>
            {isGeneratingSuggestion ? 'Thinking...' : 'Suggest Tasks'}
          </Text>
        </Pressable>

        <View style={styles.suggestionFooter}>
          <Text style={[styles.suggestionCount, { color: theme.muted }]}>
            {suggestedTasks.length === 0
              ? 'Suggestions open for review right away.'
              : 'Suggestions are ready.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    gap: 11,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  introIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introText: {
    flex: 1,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
  },
  caption: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  detailInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  button: {
    minHeight: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  aiSection: {
    marginTop: 4,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  aiHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  aiCaption: {
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
    borderWidth: 1,
  },
  categoryChipPressed: {
    opacity: 0.88,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  generateButton: {
    minHeight: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  generateButtonPressed: {
    opacity: 0.86,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  suggestionFooter: {
    marginTop: 2,
  },
  suggestionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
});
