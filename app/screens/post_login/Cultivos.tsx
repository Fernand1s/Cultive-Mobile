import {
  Bug,
  CalendarDays,
  Flag,
  HeartPulse,
  Leaf,
  MapPin,
  Ruler,
  Scissors,
  Sprout,
  Timer,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Abas, Botao, Cartao, Carregando, EstadoVazio, Etiqueta, LinhaInfo } from '../../../components/ui';
import { CabecalhoTela } from '../../../components/CabecalhoTela';
import { useSync } from '../../../contexts/SyncContext';
import {
  ROTULO_ESTADO_PLANTA,
  ROTULO_STATUS_CULTIVO,
  ROTULO_TIPO_CICLO,
  type Cultivo,
  type EstadoPlanta,
  type StatusCultivo,
} from '../../../database/types';
import { useAtualizarStatusCultivo, useCultivos } from '../../../hooks/useDados';
import { cores, espacamento, fonte, raio } from '../../../theme';
import { ModalAtualizarCultivo } from './cultivo_modais/ModalAtualizarCultivo';

type FiltroEstagio = 'EM_PREPARO' | 'ATIVO' | 'EM_PRODUCAO' | 'ENCERRADOS';

const ESTAGIO_DA_ABA: Record<Exclude<FiltroEstagio, 'ENCERRADOS'>, StatusCultivo> = {
  EM_PREPARO: 'EM_PREPARO',
  ATIVO: 'ATIVO',
  EM_PRODUCAO: 'EM_PRODUCAO',
};

const ehEncerrado = (status: StatusCultivo) => status === 'COLHIDO' || status === 'CANCELADO';

const TOM_ESTADO: Record<EstadoPlanta, 'verde' | 'vermelho' | 'ambar'> = {
  SAUDAVEL: 'verde',
  PRAGA: 'vermelho',
  ATENCAO: 'ambar',
  CRITICO: 'vermelho',
};

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

function CartaoResumo({
  rotulo,
  valor,
  icone,
}: {
  rotulo: string;
  valor: number;
  icone: React.ReactNode;
}) {
  return (
    <Cartao style={estilos.resumo}>
      <View style={estilos.resumoTopo}>
        <Text style={estilos.resumoRotulo}>{rotulo}</Text>
        {icone}
      </View>
      <Text style={estilos.resumoValor}>{valor}</Text>
    </Cartao>
  );
}

function CartaoCultivo({
  cultivo,
  aoAtualizar,
}: {
  cultivo: Cultivo;
  aoAtualizar: (cultivo: Cultivo, atalho?: 'praga' | 'colheita' | 'avancar' | 'encerrar') => void;
}) {
  const encerrado = ehEncerrado(cultivo.statusCultivo);
  const comPraga = cultivo.estadoPlanta === 'PRAGA' || cultivo.estadoPlanta === 'CRITICO';

  return (
    <Cartao style={estilos.cartaoCultivo}>
      <View style={estilos.cabecalhoCartao}>
        <Text style={estilos.nomePlanta} numberOfLines={1}>
          {cultivo.nomePlanta ?? 'Cultivo sem planta'}
        </Text>
        <Text style={[estilos.statusCultivo, encerrado && { color: cores.textoSuave }]}>
          {ROTULO_STATUS_CULTIVO[cultivo.statusCultivo].toUpperCase()}
        </Text>
      </View>

      {cultivo.syncStatus === 'pending' && (
        <Etiqueta texto="Aguardando envio" tom="azul" />
      )}
      {cultivo.syncStatus === 'error' && (
        <View style={estilos.acoes}>
          <Etiqueta texto="Falha ao enviar" tom="vermelho" />
          <Botao
            titulo="Revisar envio"
            variante="secundario"
            aoPressionar={() => aoAtualizar(cultivo)}
          />
        </View>
      )}

      <View style={estilos.infos}>
        <LinhaInfo
          icone={<HeartPulse size={14} color={cores.textoSuave} />}
          rotulo="Saúde do Cultivo"
          valor={ROTULO_ESTADO_PLANTA[cultivo.estadoPlanta]}
          corValor={comPraga ? cores.vermelho : '#15803D'}
        />
        <LinhaInfo
          icone={<MapPin size={14} color={cores.textoSuave} />}
          rotulo="Área Plantada"
          valor={cultivo.nomeArea ?? '—'}
        />
        <LinhaInfo
          icone={<Ruler size={14} color={cores.textoSuave} />}
          rotulo="Quantidade"
          valor={`${cultivo.quantidadePlantada} ${cultivo.unidadeMedida ?? 'un'}`}
        />
        <LinhaInfo
          icone={<CalendarDays size={14} color={cores.textoSuave} />}
          rotulo="Data do Plantio"
          valor={formatarData(cultivo.dataPlantio)}
        />
        <LinhaInfo
          icone={<Timer size={14} color={cores.textoSuave} />}
          rotulo="Tipo de Ciclo"
          valor={ROTULO_TIPO_CICLO[cultivo.tipoCiclo]}
        />
      </View>

      {!encerrado && (
        <View style={estilos.acoes}>
          <Botao
            titulo="Praga"
            variante={comPraga ? 'perigo' : 'secundario'}
            icone={<Bug size={16} color={comPraga ? '#fff' : cores.texto} />}
            aoPressionar={() => aoAtualizar(cultivo, 'praga')}
            style={estilos.acaoFlex}
          />
          <Botao
            titulo="Colheita"
            variante="secundario"
            icone={<Scissors size={16} color={cores.verde} />}
            aoPressionar={() => aoAtualizar(cultivo, 'colheita')}
            style={estilos.acaoFlex}
          />
          <Botao
            titulo=""
            variante="secundario"
            icone={<Timer size={18} color={cores.texto} />}
            aoPressionar={() => aoAtualizar(cultivo, 'avancar')}
            style={estilos.acaoIcone}
          />
          <Botao
            titulo=""
            variante="secundario"
            icone={<Flag size={18} color={cores.texto} />}
            aoPressionar={() => aoAtualizar(cultivo, 'encerrar')}
            style={estilos.acaoIcone}
          />
        </View>
      )}
    </Cartao>
  );
}

export default function Cultivos() {
  const { data: cultivos, isLoading, refetch } = useCultivos();
  const { sincronizarAgora, sincronizando } = useSync();
  const atualizarStatus = useAtualizarStatusCultivo();

  const [aba, setAba] = useState<FiltroEstagio>('ATIVO');
  const [emEdicao, setEmEdicao] = useState<Cultivo | null>(null);
  const [atalho, setAtalho] = useState<'praga' | 'colheita' | 'avancar' | 'encerrar' | undefined>();

  const lista = cultivos ?? [];

  const contagens = useMemo(
    () => ({
      EM_PREPARO: lista.filter((c) => c.statusCultivo === 'EM_PREPARO').length,
      ATIVO: lista.filter((c) => c.statusCultivo === 'ATIVO').length,
      EM_PRODUCAO: lista.filter((c) => c.statusCultivo === 'EM_PRODUCAO').length,
      ENCERRADOS: lista.filter((c) => ehEncerrado(c.statusCultivo)).length,
    }),
    [lista]
  );

  const alertasSaude = useMemo(
    () =>
      lista.filter(
        (c) => !ehEncerrado(c.statusCultivo) && c.estadoPlanta !== 'SAUDAVEL'
      ).length,
    [lista]
  );

  const ativos = contagens.EM_PREPARO + contagens.ATIVO + contagens.EM_PRODUCAO;

  const filtrados = useMemo(() => {
    if (aba === 'ENCERRADOS') return lista.filter((c) => ehEncerrado(c.statusCultivo));
    return lista.filter((c) => c.statusCultivo === ESTAGIO_DA_ABA[aba]);
  }, [lista, aba]);

  const abrirEdicao = (
    cultivo: Cultivo,
    atalhoEscolhido?: 'praga' | 'colheita' | 'avancar' | 'encerrar'
  ) => {
    setEmEdicao(cultivo);
    setAtalho(atalhoEscolhido);
  };

  const confirmar = async (
    statusCultivo: StatusCultivo,
    estadoPlanta: EstadoPlanta,
    observacao: string
  ) => {
    if (!emEdicao) return;
    await atualizarStatus.mutateAsync({
      cultivo: emEdicao,
      statusCultivo,
      estadoPlanta,
      observacao: observacao.trim() ? observacao.trim() : null,
    });
    setEmEdicao(null);
    setAtalho(undefined);
  };

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <CabecalhoTela
        titulo="Controle de Cultivos"
        subtitulo="Gestão fitotécnica e monitoramento de safra."
      />

      <FlatList
        data={filtrados}
        keyExtractor={(item) => String(item.idCultivo)}
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={sincronizando}
            onRefresh={() => {
              void sincronizarAgora();
              void refetch();
            }}
            colors={[cores.verde]}
            tintColor={cores.verde}
          />
        }
        ListHeaderComponent={
          <View style={estilos.topo}>
            <View style={estilos.resumos}>
              <CartaoResumo
                rotulo="CULTIVOS ATIVOS"
                valor={ativos}
                icone={<Sprout size={18} color={cores.verde} />}
              />
              <CartaoResumo
                rotulo="ALERTAS DE SAÚDE"
                valor={alertasSaude}
                icone={<HeartPulse size={18} color={cores.vermelho} />}
              />
              <CartaoResumo
                rotulo="SAFRAS ENCERRADAS"
                valor={contagens.ENCERRADOS}
                icone={<Flag size={18} color={cores.textoSuave} />}
              />
            </View>

            <Abas<FiltroEstagio>
              ativa={aba}
              aoSelecionar={setAba}
              opcoes={[
                { valor: 'EM_PREPARO', rotulo: 'Em Preparo', contagem: contagens.EM_PREPARO },
                { valor: 'ATIVO', rotulo: 'Em Crescimento', contagem: contagens.ATIVO },
                { valor: 'EM_PRODUCAO', rotulo: 'Em Produção', contagem: contagens.EM_PRODUCAO },
                { valor: 'ENCERRADOS', rotulo: 'Encerrados', contagem: contagens.ENCERRADOS },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => <CartaoCultivo cultivo={item} aoAtualizar={abrirEdicao} />}
        ItemSeparatorComponent={() => <View style={{ height: espacamento.md }} />}
        ListEmptyComponent={
          isLoading ? (
            <Carregando />
          ) : (
            <EstadoVazio
              icone={<Leaf size={40} color={cores.textoFraco} />}
              titulo="Nenhum cultivo neste estágio"
              descricao="Os cultivos são cadastrados no sistema web. Sincronize para trazer as novidades do campo."
            />
          )
        }
      />

      <ModalAtualizarCultivo
        cultivo={emEdicao}
        atalho={atalho}
        salvando={atualizarStatus.isPending}
        aoFechar={() => {
          setEmEdicao(null);
          setAtalho(undefined);
        }}
        aoConfirmar={confirmar}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: espacamento.lg,
    paddingBottom: 110,
  },
  topo: {
    gap: espacamento.md,
    marginBottom: espacamento.md,
  },
  resumos: {
    flexDirection: 'row',
    gap: espacamento.sm,
  },
  resumo: {
    flex: 1,
    padding: espacamento.md,
    gap: espacamento.xs,
  },
  resumoTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  resumoRotulo: {
    flex: 1,
    fontSize: fonte.minusculo - 1,
    fontWeight: '700',
    color: cores.textoSuave,
  },
  resumoValor: {
    fontSize: 26,
    fontWeight: '700',
    color: cores.texto,
  },
  cartaoCultivo: {
    gap: espacamento.sm,
  },
  cabecalhoCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
  },
  nomePlanta: {
    flex: 1,
    fontSize: fonte.subtitulo,
    fontWeight: '700',
    color: cores.texto,
  },
  statusCultivo: {
    fontSize: fonte.pequeno,
    fontWeight: '700',
    color: cores.verde,
  },
  infos: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    paddingTop: espacamento.sm,
  },
  acoes: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginTop: espacamento.xs,
  },
  acaoFlex: {
    flex: 1,
    paddingHorizontal: espacamento.sm,
  },
  acaoIcone: {
    width: 48,
    paddingHorizontal: 0,
    borderRadius: raio.md,
  },
});
