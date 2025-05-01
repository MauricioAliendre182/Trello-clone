import { User } from "@models/user.model";
import { GenericDataSource } from "./generic-data-source";

export class UserDataSource extends GenericDataSource<User> {
  searchConfig = {
    name: true,
    email: true
  };

  setSearchConfig(config: {name: boolean, email: boolean}) {
    this.searchConfig = config;
  }

  find(query: string) {
    const newUsers = this.originalData.filter((element) => {
      const matchesName = this.searchConfig.name && element.name.toLowerCase().includes(query.toLowerCase());
      const matchesEmail = this.searchConfig.email && element.email.toLowerCase().includes(query.toLowerCase());
      const matchesId = element.id.toString().includes(query);

      return matchesName || matchesEmail || matchesId;
    });
    this.data.next(newUsers);
  }
}
