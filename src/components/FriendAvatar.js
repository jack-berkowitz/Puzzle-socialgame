import React, { useState } from 'react';
import { Pressable, Image, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, igGradient } from '../theme/colors';

export default function FriendAvatar({ friend, ghost, size = 36, onPress }) {
  const [failed, setFailed] = useState(false);
  const initial = (friend.username || '?').slice(0, 1).toUpperCase();
  const showImage = !ghost && friend.profilePic && !failed;
  const innerSize = size - 4;

  return (
    <Pressable onPress={onPress} style={[styles.wrap, { width: size, height: size }]}>
      {!ghost ? (
        <LinearGradient
          colors={igGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ringFill, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.ringFill,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.border,
            },
          ]}
        />
      )}

      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri: friend.profilePic }}
            style={[styles.img, { width: innerSize - 4, height: innerSize - 4, borderRadius: (innerSize - 4) / 2 }]}
            onError={() => setFailed(true)}
          />
        ) : (
          <Text style={[styles.initial, ghost && styles.initialGhost]}>{initial}</Text>
        )}
      </View>

      <View style={styles.tag}>
        <Text style={styles.tagText}>L{friend.level}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
  },
  inner: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: {
    resizeMode: 'cover',
  },
  initial: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 14,
  },
  initialGhost: {
    color: colors.textDim,
  },
  tag: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tagText: {
    ...fonts.uiBold,
    fontSize: 8,
    color: colors.textDim,
  },
});
