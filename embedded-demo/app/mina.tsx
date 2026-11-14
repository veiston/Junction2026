import { StyleSheet, View } from "react-native";

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

export default function ProfileScreen() {
  return (
    <Screen topColor={colors.background}>
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
