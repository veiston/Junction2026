import { StyleSheet, Switch, View } from "react-native";

import { setModelProvider, useModelProvider } from "@/api/modelProvider";

import type { IconName } from "@/components/Icon";
import { ListGroup } from "@/components/ListGroup";
import { ListRow } from "@/components/ListRow";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Tile } from "@/components/Tile";
import { colors, spacing } from "@/theme";

const SERVICE_ROWS: { icon: IconName; title: string }[] = [
  { icon: "key-outline", title: "Tunnistaminen" },
  { icon: "card-account-details-outline", title: "Tarkista verkkopankin käyttäjätunnus" },
  { icon: "file-account-outline", title: "Asiakastiedot" },
];

// TODO: Everything should be in English so accessible to international judges / hacker-voters
export default function ProfileScreen() {
  const useLocalModel = useModelProvider() === "local";
  return (
    <Screen topColor={colors.background}>
      <SectionHeader title="AI coach" />
      <ListGroup>
        <ListRow
          icon="robot-outline"
          title="Use local model"
          subtitle="A private model running on S-Bank servers "
          trailing={
            <Switch
              accessibilityLabel="Use local model"
              value={useLocalModel}
              onValueChange={(on) => setModelProvider(on ? "local" : "cloud")}
              trackColor={{ true: colors.primary }}
            />
          }
        />
      </ListGroup>
      <ListGroup>
        <ListRow icon="logout" title="Kirjaudu ulos" />
      </ListGroup>
      <ListGroup>
        <ListRow
          icon="account-outline"
          title="Omat tiedot"
          subtitle="Yhteystiedot, asiakasomistajuuden tiedot, viestintä, yksityisyys"
        />
      </ListGroup>
      <SectionHeader title="Tunnistaminen" />
      <View style={styles.tiles}>
        <Tile icon="qrcode-scan" label="Lue QR-koodi" style={styles.tile} />
        <Tile icon="shield-key-outline" label="Hyväksy tapahtuma" style={styles.tile} />
      </View>
      <SectionHeader title="Pankin palvelut" />
      <ListGroup>
        {SERVICE_ROWS.map((row) => (
          <ListRow key={row.title} icon={row.icon} title={row.title} />
        ))}
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: "row",
    gap: spacing.md,
  },
  tile: {
    flex: 1,
  },
});
