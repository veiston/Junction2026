# Junction 2026 – S-Pankki dataset

## Files

| File | Size | Contents |
|---|---|---|
| `tx_junction_transactions.csv` | ~346 MB | Transactions: `customer_id`, `bank_account_id`, `tx_date`, `tx_timestamp`, `category`, `tx_amount_eur`, `balance_after_eur`, `transaction_type`, `merchant_id`, `mcc_code` (stored with Git LFS) |
| `tx_customers_junction.csv` | ~100 KB | Customers: `customer_id`, `customer_postal_code`, `customer_age` |
| `mtg_negotiation_history.csv` | ~640 KB | Mortgage application event history per `mortgage_customer_id` |
| `mtg_tx_customer_link_and_final_mtg_infio.csv` | ~20 KB | Links `mortgage_customer_id` to `customer_id`, plus each application's final outcome |

The CSVs start with a UTF-8 BOM. Use an encoding such as `utf-8-sig` (Python) to read them, or the first column name will start with a stray character.

## Downloading

`tx_junction_transactions.csv` is too large for regular git, so it is stored with [Git LFS](https://git-lfs.com). If you download it the wrong way, you get a small text file that starts with `version https://git-lfs.github.com/spec/v1` instead of the data.

### Option 1: Download through the browser (no git needed)

On GitHub, open each file and click **Download raw file**. This also works for the LFS file.

The **Code → Download ZIP** button may give you only the LFS pointer file instead of the full transactions CSV. Whether it does depends on a repository setting. If the CSV in the ZIP is only a few lines long, use the download button for that file as described above.

### Option 2: Clone with git

Install Git LFS first:

```bash
# macOS
brew install git-lfs
# Debian/Ubuntu
sudo apt install git-lfs
# Windows: included with Git for Windows

git lfs install
```

Then clone:

```bash
git clone git@github.com:hackjunction/Junction-2026-S-pankki.git
```

If you cloned before installing Git LFS, run this inside the repository:

```bash
git lfs pull
```

### Checking the download

```bash
head -c 200 tx_junction_transactions.csv
```

You should see CSV data, not a `version https://git-lfs...` line.
