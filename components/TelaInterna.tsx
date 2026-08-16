import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cores, espacamento, fonte, raio } from '../theme';

/** Moldura das telas empilhadas (as que abrem a partir do Perfil). */
export function TelaInterna({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Pressable
          style={estilos.voltar}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Voltar"
          hitSlop={8}
        >
          <ArrowLeft size={22} color={cores.texto} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {subtitulo && <Text style={estilos.subtitulo}>{subtitulo}</Text>}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.md,
  },
  voltar: {
    width: 44,
    height: 44,
    borderRadius: raio.md,
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: fonte.titulo - 2,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
  },
  conteudo: {
    padding: espacamento.lg,
    paddingTop: 0,
    gap: espacamento.md,
    paddingBottom: espacamento.xxl,
  },
});
